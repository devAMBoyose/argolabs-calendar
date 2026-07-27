/**
 * Argo Calendar Portal - Google Forms bridge
 * Install this script in the response spreadsheet connected to your Google Form.
 */
const CONFIG = {
  WEBHOOK_URL: 'https://YOUR-SERVER-DOMAIN/api/webhooks/google-form',
  WEBHOOK_SECRET: 'MATCH_FORM_WEBHOOK_SECRET_FROM_SERVER',
  TIMEZONE: 'Asia/Manila'
};

function onFormSubmit(e) {
  if (!e || !e.namedValues) throw new Error('This function must run from an installable spreadsheet form-submit trigger.');
  const values = e.namedValues;
  const get = (title) => String((values[title] || [''])[0]).trim();
  const eventDate = get('Date');
  const startTime = get('Start Time');
  const endTime = get('End Time');
  const payload = {
    title: get('Event Title'),
    department: get('Department') || 'General',
    startAt: combineDateTime_(eventDate, startTime),
    endAt: combineDateTime_(eventDate, endTime),
    location: get('Location'),
    attendees: splitEmails_(get('Guest Emails')),
    priority: (get('Priority') || 'NORMAL').toUpperCase(),
    description: get('Description'),
    remarks: get('Remarks'),
    reminderMinutes: Number(get('Reminder Minutes') || 30),
    isPublic: !/^no$/i.test(get('Publish Publicly'))
  };
  const response = UrlFetchApp.fetch(CONFIG.WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: {'X-Webhook-Secret': CONFIG.WEBHOOK_SECRET},
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  const code = response.getResponseCode();
  if (code < 200 || code >= 300) throw new Error(`Portal webhook failed (${code}): ${response.getContentText()}`);
}

function combineDateTime_(dateText, timeText) {
  const date = new Date(dateText);
  const time = new Date(`January 1, 2000 ${timeText}`);
  if (isNaN(date.getTime()) || isNaN(time.getTime())) throw new Error(`Invalid date/time: ${dateText} ${timeText}`);
  date.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return Utilities.formatDate(date, CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function splitEmails_(value) {
  return value.split(/[;,\n]/).map(v => v.trim().toLowerCase()).filter(Boolean);
}

function testWebhook() {
  const fake = {namedValues:{
    'Event Title':['Portal Test Event'],'Department':['HR'],'Date':['7/30/2026'],'Start Time':['9:00 AM'],'End Time':['10:00 AM'],'Location':['Conference Room'],'Guest Emails':[''],'Priority':['NORMAL'],'Description':['Apps Script connectivity test'],'Remarks':['Created through testWebhook'],'Reminder Minutes':['30'],'Publish Publicly':['Yes']
  }};
  onFormSubmit(fake);
}
