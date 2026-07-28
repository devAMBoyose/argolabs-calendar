import Event from '../models/Event.js';
import AuditLog from '../models/AuditLog.js';
import { createGoogleEvent } from '../services/googleCalendar.js';
import { parsePhilippineDateTime } from '../utils/philippineTime.js';

export async function formSubmit(req, res) {
  if (req.headers['x-webhook-secret'] !== process.env.FORM_WEBHOOK_SECRET) {
    return res.status(401).json({ message: 'Invalid webhook secret.' });
  }

  const body = req.body;
  if (!body.title || !body.startAt || !body.endAt) {
    return res
      .status(400)
      .json({ message: 'title, startAt, and endAt are required.' });
  }

  const startAt = parsePhilippineDateTime(body.startAt);
  const endAt = parsePhilippineDateTime(body.endAt);

  if (!startAt || !endAt) {
    return res.status(400).json({
      message: 'Invalid date/time. Send ISO values with +08:00 or Z.',
    });
  }

  if (endAt <= startAt) {
    return res.status(400).json({
      message: 'End time must be after start time.',
    });
  }

  let event = await Event.create({
    title: body.title,
    description: body.description || '',
    department: body.department || 'General',
    location: body.location || '',
    startAt,
    endAt,
    attendees: Array.isArray(body.attendees) ? body.attendees : [],
    priority: body.priority || 'NORMAL',
    status: 'PENDING',
    remarks: body.remarks || '',
    isPublic: body.isPublic !== false,
    reminderMinutes: Number(body.reminderMinutes || 30),
    source: 'GOOGLE_FORM',
  });

  try {
    const googleEvent = await createGoogleEvent(event);
    event.googleEventId = googleEvent.id;
    event.googleHtmlLink = googleEvent.htmlLink;
    await event.save();
  } catch (error) {
    await event.deleteOne();
    throw error;
  }

  await AuditLog.create({
    action: 'EVENT_CREATED_FROM_FORM',
    entityId: event._id,
    actorLabel: 'Google Form',
    changes: body,
    ip: req.ip,
  });

  return res.status(201).json({
    ok: true,
    eventId: event._id,
    googleEventId: event.googleEventId,
  });
}
