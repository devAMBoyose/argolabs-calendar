# Argo Calendar Portal — Free Render Deployment

This build works without Google Calendar. Events are stored in MongoDB Atlas, displayed in the portal, and guest invitations/updates/reminders are sent through Resend when configured.

## 1. Test locally

1. Install Node.js 20 or newer and MongoDB, or use MongoDB Atlas.
2. Copy `server/.env.example` to `server/.env`.
3. Fill in `MONGODB_URI`, `JWT_SECRET`, and owner credentials.
4. Run:

```bash
npm install
npm run seed
npm run dev
```

## 2. Push to GitHub

Do not commit `.env` or `node_modules`.

```bash
git init
git add .
git commit -m "Deploy Argo Calendar Portal"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

## 3. Create MongoDB Atlas Free cluster

1. Create a MongoDB Atlas account.
2. Create a Free/M0 cluster.
3. Create a database user and password.
4. In Network Access, add `0.0.0.0/0` so Render can connect. Use a strong database password.
5. Copy the Node.js connection string and replace `<password>`.
6. Use database name `argo_calendar`.

Example:

```text
mongodb+srv://argo_user:ENCODED_PASSWORD@cluster0.example.mongodb.net/argo_calendar?retryWrites=true&w=majority
```

## 4. Configure Resend

1. Create a Resend account and API key.
2. For testing with `onboarding@resend.dev`, Resend only permits delivery to the email address belonging to your Resend account.
3. To email arbitrary guests, add and verify a domain you own in Resend, then use a sender such as:

```text
Argo Calendar <calendar@notifications.yourdomain.com>
```

The application still works if Resend is not configured; only email delivery is skipped.

## 5. Deploy on Render

1. Open Render and select **New > Blueprint**.
2. Connect the GitHub repository.
3. Render detects `render.yaml`.
4. Enter all secret environment variables requested by the Blueprint.
5. Deploy.

Use these values:

```text
MONGODB_URI=<Atlas connection string>
CLIENT_URL=https://YOUR-SERVICE.onrender.com
APP_URL=https://YOUR-SERVICE.onrender.com
JWT_SECRET=<long random secret>
OWNER_EMAIL=hrargolabs@gmail.com
OWNER_PASSWORD=<strong password>
RESEND_API_KEY=<Resend API key>
RESEND_FROM=Argo Calendar <calendar@your-verified-domain.com>
REMINDER_SECRET=<different long random secret>
FORM_WEBHOOK_SECRET=<another long random secret>
```

If you are not ready for email, set:

```text
EMAIL_ENABLED=false
```

## 6. Seed the production owner and demo events

After the first deploy, open Render Shell for the web service and run:

```bash
npm run seed
```

Then sign in using `OWNER_EMAIL` and `OWNER_PASSWORD`.

## 7. Schedule reminders for free

A free Render web service may sleep, so do not rely on an in-process timer. Use an external HTTP scheduler such as cron-job.org.

Create an hourly job:

```text
https://YOUR-SERVICE.onrender.com/api/reminders/run?secret=YOUR_URL_ENCODED_REMINDER_SECRET
```

Method: `GET`
Schedule: every hour

For better secret handling, configure a POST request with the header:

```text
x-reminder-secret: YOUR_REMINDER_SECRET
```

The endpoint checks upcoming events, calculates `startAt - reminderMinutes`, sends due reminders once, and records `reminderSentAt` to avoid duplicates.

## 8. Verification

Open:

```text
https://YOUR-SERVICE.onrender.com/api/health
```

Expected response includes:

```json
{
  "ok": true,
  "emailConfigured": true,
  "googleCalendarEnabled": false
}
```

Test this flow:

1. Sign in.
2. Create an event with your test email in Guest emails.
3. Confirm the event appears on Dashboard and Public Calendar.
4. Confirm the invitation email arrives.
5. Set an event 10–15 minutes in the future with a 10-minute reminder.
6. Trigger `/api/reminders/run` manually once to test.
7. Update or cancel an event and confirm the guest notification.

## Important limitations

- Render Free can sleep when inactive, so the first request may be delayed.
- Resend Free has sending quotas.
- Resend requires a verified custom domain to send to arbitrary guest addresses. Without a domain, testing is limited to your own Resend account email.
- MongoDB Atlas Free is intended for small workloads and demos.
