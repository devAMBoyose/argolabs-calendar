# Local Demo Fixes

- Google Calendar is optional. Creating, editing, and deleting events works in MongoDB even when Google OAuth is not configured.
- The seed command creates or resets the owner account from `server/.env`.
- The seed command creates four demo events when the database has no portal events.
- Public calendar data is normalized so an empty or failed API response does not crash the React application.

## Run

```bash
npm install
npm run seed
npm run dev
```

Default login from `server/.env`:

- Email: `hrargolabs@gmail.com`
- Password: `ChangeMeImmediately123!`
