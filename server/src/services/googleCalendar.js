import { google } from 'googleapis';
import Integration from '../models/Integration.js';
import { decrypt } from '../utils/crypto.js';
import {
  PHILIPPINE_TIME_ZONE,
  toPhilippineRfc3339,
} from '../utils/philippineTime.js';

function oauth() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl(state) {
  const client = oauth();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: true,
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    state,
  });
}

export async function exchangeCode(code) {
  const client = oauth();
  const { tokens } = await client.getToken(code);
  return tokens;
}

async function authorizedClient() {
  const row = await Integration.findOne({ provider: 'GOOGLE_CALENDAR' });
  if (!row) {
    throw Object.assign(new Error('Google Calendar is not connected.'), {
      status: 503,
    });
  }

  const client = oauth();
  client.setCredentials({
    refresh_token: decrypt(row.encryptedRefreshToken),
  });
  return client;
}

function eventRequestBody(event, { includePortalMetadata = false } = {}) {
  const body = {
    summary: event.title,
    description: [
      event.description,
      event.remarks && `Remarks: ${event.remarks}`,
      `Status: ${event.status}`,
      `Priority: ${event.priority}`,
    ]
      .filter(Boolean)
      .join('\n\n'),
    location: event.location,
    start: {
      dateTime: toPhilippineRfc3339(event.startAt),
      timeZone: PHILIPPINE_TIME_ZONE,
    },
    end: {
      dateTime: toPhilippineRfc3339(event.endAt),
      timeZone: PHILIPPINE_TIME_ZONE,
    },
    attendees: (event.attendees || []).map((email) => ({ email })),
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: event.reminderMinutes },
        { method: 'email', minutes: event.reminderMinutes },
      ],
    },
  };

  if (includePortalMetadata) {
    body.extendedProperties = {
      private: {
        portalEventId: String(event._id),
        status: event.status,
        priority: event.priority,
      },
    };
  }

  return body;
}

export async function createGoogleEvent(event) {
  const auth = await authorizedClient();
  const calendar = google.calendar({ version: 'v3', auth });

  const { data } = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    requestBody: eventRequestBody(event, { includePortalMetadata: true }),
    sendUpdates: 'all',
  });

  return data;
}

export async function updateGoogleEvent(event) {
  if (!event.googleEventId) return;

  const auth = await authorizedClient();
  const calendar = google.calendar({ version: 'v3', auth });

  await calendar.events.patch({
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    eventId: event.googleEventId,
    requestBody: eventRequestBody(event),
    sendUpdates: 'all',
  });
}

export async function deleteGoogleEvent(event) {
  if (!event.googleEventId) return;

  const auth = await authorizedClient();
  const calendar = google.calendar({ version: 'v3', auth });

  try {
    await calendar.events.delete({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      eventId: event.googleEventId,
      sendUpdates: 'all',
    });
  } catch (error) {
    if (error.code !== 404) throw error;
  }
}
