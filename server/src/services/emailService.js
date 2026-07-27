const RESEND_API_URL = 'https://api.resend.com/emails';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeRecipients(values) {
  if (!Array.isArray(values)) return [];

  return [...new Set(values
    .map((value) => typeof value === 'string' ? value : value?.email)
    .map((value) => String(value || '').trim().toLowerCase())
    .filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
  )];
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: process.env.TIMEZONE || 'Asia/Manila',
  }).format(date);
}

function appUrl() {
  return (process.env.APP_URL || process.env.CLIENT_URL || '').split(',')[0].trim();
}

export function emailIsConfigured() {
  return Boolean(
    process.env.EMAIL_ENABLED !== 'false' &&
    process.env.RESEND_API_KEY &&
    process.env.RESEND_FROM
  );
}

async function sendEmail({ to, subject, html }) {
  const recipients = normalizeRecipients(to);

  if (!emailIsConfigured()) {
    return { sent: false, skipped: true, reason: 'Email is not configured.' };
  }

  if (recipients.length === 0) {
    return { sent: false, skipped: true, reason: 'No valid recipients.' };
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM,
      to: recipients,
      subject,
      html,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload?.message || 'Resend rejected the email request.');
    error.status = response.status;
    throw error;
  }

  return { sent: true, id: payload.id, recipients };
}

function eventHtml(event, heading, introduction) {
  const url = appUrl();

  return `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#17211d">
      <div style="background:#0b3b2e;color:white;padding:24px;border-radius:16px 16px 0 0">
        <div style="font-size:12px;letter-spacing:.12em;font-weight:700;color:#a9f0ce">ARGO LABS CALENDAR</div>
        <h1 style="margin:8px 0 0;font-size:26px">${escapeHtml(heading)}</h1>
      </div>
      <div style="border:1px solid #dfe7e2;border-top:0;padding:24px;border-radius:0 0 16px 16px">
        <p>${escapeHtml(introduction)}</p>
        <h2 style="margin-bottom:8px">${escapeHtml(event.title)}</h2>
        <p><strong>Department:</strong> ${escapeHtml(event.department || 'Not specified')}</p>
        <p><strong>Starts:</strong> ${escapeHtml(formatDate(event.startAt))}</p>
        <p><strong>Ends:</strong> ${escapeHtml(formatDate(event.endAt))}</p>
        ${event.location ? `<p><strong>Location:</strong> ${escapeHtml(event.location)}</p>` : ''}
        <p><strong>Status:</strong> ${escapeHtml(event.status || 'PENDING')}</p>
        ${event.description ? `<p><strong>Description:</strong><br>${escapeHtml(event.description)}</p>` : ''}
        ${url ? `<p style="margin-top:24px"><a href="${escapeHtml(url)}" style="background:#0d6a4d;color:white;text-decoration:none;padding:11px 16px;border-radius:8px;display:inline-block">Open public calendar</a></p>` : ''}
        <p style="margin-top:24px;color:#68766f;font-size:12px">This is an automated message from Argo Labs Calendar Portal.</p>
      </div>
    </div>
  `;
}

export async function sendEventCreatedEmail(event) {
  return sendEmail({
    to: event.attendees,
    subject: `Event invitation: ${event.title}`,
    html: eventHtml(
      event,
      'You have been added to an event',
      'An event has been created and your email address is included in the guest list.'
    ),
  });
}

export async function sendEventUpdatedEmail(event) {
  return sendEmail({
    to: event.attendees,
    subject: `Event updated: ${event.title}`,
    html: eventHtml(
      event,
      'Event details were updated',
      'The schedule or details for this event have changed.'
    ),
  });
}

export async function sendEventReminderEmail(event) {
  return sendEmail({
    to: event.attendees,
    subject: `Reminder: ${event.title}`,
    html: eventHtml(
      event,
      'Upcoming event reminder',
      `This event starts in approximately ${event.reminderMinutes || 30} minutes.`
    ),
  });
}

export async function sendEventCancelledEmail(event) {
  return sendEmail({
    to: event.attendees,
    subject: `Event ${String(event.status || 'cancelled').toLowerCase()}: ${event.title}`,
    html: eventHtml(
      event,
      `Event ${String(event.status || 'cancelled').toLowerCase()}`,
      'This event is no longer active. Please review the status below.'
    ),
  });
}
