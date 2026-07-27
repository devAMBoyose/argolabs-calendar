# Argo Calendar Portal

A deployment-ready React + Express + MongoDB calendar portal with authentication, event management, public day/month/year calendar views, optional Resend email notifications, and secure scheduled reminders.

## Local setup

```bash
npm install
```

Copy `server/.env.example` to `server/.env`, then run:

```bash
npm run dev
```

The owner account and optional demo events are created automatically on first startup.

## Production deployment

Follow [`DEPLOY_FIRST.md`](./DEPLOY_FIRST.md). A Render Blueprint is included in `render.yaml`.

## Production behavior

- One Render web service serves the Express API and compiled React app.
- MongoDB Atlas stores users and events.
- Google Calendar is disabled by default.
- Resend is optional; event CRUD still succeeds if email is disabled or unavailable.
- The owner is created automatically if it does not exist.
- Demo data is created only when `SEED_DEMO_DATA=true` and no portal events exist.
