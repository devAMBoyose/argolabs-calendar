import Event from '../models/Event.js';
import AuditLog from '../models/AuditLog.js';
import {
  createGoogleEvent,
  deleteGoogleEvent,
  updateGoogleEvent,
} from '../services/googleCalendar.js';
import {
  emailIsConfigured,
  sendEventCancelledEmail,
  sendEventCreatedEmail,
  sendEventUpdatedEmail,
} from '../services/emailService.js';
import { parsePhilippineDateTime } from '../utils/philippineTime.js';

const ownerFields = [
  'title',
  'description',
  'department',
  'location',
  'startAt',
  'endAt',
  'attendees',
  'priority',
  'status',
  'remarks',
  'isPublic',
  'reminderMinutes',
];
const editorFields = ['status', 'remarks'];

function normalizeEventDateFields(data) {
  const normalized = { ...data };

  for (const field of ['startAt', 'endAt']) {
    if (normalized[field] === undefined) continue;

    const parsed = parsePhilippineDateTime(normalized[field]);
    if (!parsed) {
      return {
        error: `${field === 'startAt' ? 'Start' : 'End'} date and time is invalid.`,
      };
    }

    normalized[field] = parsed;
  }

  return { data: normalized };
}

function pick(body, fields) {
  return Object.fromEntries(
    fields.filter((key) => body[key] !== undefined).map((key) => [key, body[key]])
  );
}

async function audit(req, action, event, changes) {
  await AuditLog.create({
    action,
    entityId: event._id,
    actor: req.user?._id,
    actorLabel: req.user?.email || 'Google Form',
    changes,
    ip: req.ip,
  });
}

function googleIsConfigured() {
  return Boolean(
    process.env.GOOGLE_CALENDAR_ENABLED === 'true' &&
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI
  );
}

async function safelySend(label, send) {
  if (!emailIsConfigured()) return `${label} skipped because email is not configured.`;

  try {
    const result = await send();
    return result.sent ? null : result.reason || `${label} was skipped.`;
  } catch (error) {
    console.warn(`${label} failed:`, error.message);
    return error.message || `${label} failed.`;
  }
}

export async function list(req, res) {
  const events = await Event.find().sort({ startAt: -1 }).lean();
  res.json({ events });
}

export async function one(req, res) {
  const event = await Event.findById(req.params.id).lean();
  if (!event) return res.status(404).json({ message: 'Event not found.' });
  res.json({ event });
}

export async function create(req, res) {
  const picked = pick(req.body, ownerFields);

  if (!picked.startAt || !picked.endAt) {
    return res.status(400).json({ message: 'Start and end time are required.' });
  }

  const normalized = normalizeEventDateFields(picked);
  if (normalized.error) {
    return res.status(400).json({ message: normalized.error });
  }

  const data = normalized.data;
  if (data.endAt <= data.startAt) {
    return res.status(400).json({ message: 'End time must be after start time.' });
  }

  const event = await Event.create({
    ...data,
    attendees: Array.isArray(data.attendees) ? data.attendees : [],
    reminderSentAt: null,
    lastEmailError: '',
    createdBy: req.user._id,
    updatedBy: req.user._id,
    source: 'PORTAL',
  });

  let googleWarning = null;
  if (googleIsConfigured()) {
    try {
      const googleEvent = await createGoogleEvent(event);
      event.googleEventId = googleEvent.id;
      event.googleHtmlLink = googleEvent.htmlLink;
      await event.save();
    } catch (error) {
      googleWarning = error.message || 'Google Calendar sync failed.';
      console.warn('Google Calendar create skipped:', googleWarning);
    }
  }

  const emailWarning = await safelySend('Guest invitation email', () =>
    sendEventCreatedEmail(event)
  );

  await audit(req, 'EVENT_CREATED', event, data);
  res.status(201).json({ event, googleWarning, emailWarning });
}

export async function update(req, res) {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ message: 'Event not found.' });

  const previousStatus = event.status;
  const previousStart = event.startAt?.toISOString();
  const previousEnd = event.endAt?.toISOString();
  const previousReminderMinutes = event.reminderMinutes;
  const previousAttendees = JSON.stringify(event.attendees || []);

  const pickedChanges = pick(
    req.body,
    req.user.role === 'OWNER' ? ownerFields : editorFields
  );
  const normalized = normalizeEventDateFields(pickedChanges);

  if (normalized.error) {
    return res.status(400).json({ message: normalized.error });
  }

  const changes = normalized.data;
  Object.assign(event, changes, { updatedBy: req.user._id });

  if (event.endAt <= event.startAt) {
    return res.status(400).json({ message: 'End time must be after start time.' });
  }

  const reminderInputsChanged =
    previousStart !== event.startAt?.toISOString() ||
    previousEnd !== event.endAt?.toISOString() ||
    previousReminderMinutes !== event.reminderMinutes ||
    previousAttendees !== JSON.stringify(event.attendees || []);

  if (reminderInputsChanged) {
    event.reminderSentAt = null;
    event.lastEmailError = '';
  }

  let googleWarning = null;
  if (event.googleEventId && googleIsConfigured()) {
    try {
      await updateGoogleEvent(event);
    } catch (error) {
      googleWarning = error.message || 'Google Calendar update failed.';
      console.warn('Google Calendar update skipped:', googleWarning);
    }
  }

  await event.save();

  const becameInactive =
    ['CANCELLED', 'TERMINATED'].includes(event.status) &&
    previousStatus !== event.status;

  const emailWarning = await safelySend(
    becameInactive ? 'Cancellation email' : 'Event update email',
    () =>
      becameInactive
        ? sendEventCancelledEmail(event)
        : sendEventUpdatedEmail(event)
  );

  await audit(req, 'EVENT_UPDATED', event, changes);
  res.json({ event, googleWarning, emailWarning });
}

export async function remove(req, res) {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ message: 'Event not found.' });

  if (event.googleEventId && googleIsConfigured()) {
    try {
      await deleteGoogleEvent(event);
    } catch (error) {
      console.warn('Google Calendar delete skipped:', error.message);
    }
  }

  event.status = 'CANCELLED';
  await safelySend('Deletion notice email', () => sendEventCancelledEmail(event));

  await audit(req, 'EVENT_DELETED', event, { title: event.title });
  await event.deleteOne();
  res.status(204).end();
}
