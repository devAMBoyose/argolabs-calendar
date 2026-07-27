import Event from '../models/Event.js';
import { emailIsConfigured, sendEventReminderEmail } from '../services/emailService.js';

function authorized(req) {
  const expected = process.env.REMINDER_SECRET;
  const provided = req.get('x-reminder-secret') || req.query.secret;
  return Boolean(expected && provided && expected === provided);
}

export async function runReminders(req, res) {
  if (!authorized(req)) {
    return res.status(401).json({ message: 'Invalid reminder secret.' });
  }

  if (!emailIsConfigured()) {
    return res.status(503).json({
      message: 'Email is not configured.',
      required: ['RESEND_API_KEY', 'RESEND_FROM'],
    });
  }

  const now = new Date();
  const maximumLookAhead = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);

  const events = await Event.find({
    startAt: { $gt: now, $lte: maximumLookAhead },
    status: { $nin: ['COMPLETED', 'CANCELLED', 'TERMINATED'] },
    reminderSentAt: null,
    'attendees.0': { $exists: true },
  }).sort({ startAt: 1 });

  const results = [];

  for (const event of events) {
    const reminderMinutes = Number(event.reminderMinutes || 30);
    const dueAt = new Date(event.startAt.getTime() - reminderMinutes * 60 * 1000);

    if (dueAt > now) continue;

    try {
      const email = await sendEventReminderEmail(event);
      if (email.sent) {
        event.reminderSentAt = now;
        event.lastEmailError = '';
        await event.save();
      }

      results.push({ eventId: event._id, title: event.title, ...email });
    } catch (error) {
      event.lastEmailError = String(error.message || error).slice(0, 500);
      await event.save();
      results.push({ eventId: event._id, title: event.title, sent: false, error: error.message });
    }
  }

  const sent = results.filter((result) => result.sent).length;
  const failed = results.filter((result) => result.error).length;

  return res.json({
    ok: true,
    checkedAt: now.toISOString(),
    candidates: events.length,
    processed: results.length,
    sent,
    failed,
    results,
  });
}
