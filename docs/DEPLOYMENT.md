# Deployment guide

## Recommended deployment

- MongoDB Atlas for the database
- Render, Railway, Fly.io, or another Node-compatible host for the backend
- The backend can serve the built React frontend in production

## Build

From the project root:

```bash
npm install
npm run build
```

For a single-service deployment, use:

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Root directory: project root

Set `NODE_ENV=production` and all values from `server/.env.example`.

## Production URLs

Set:

```env
CLIENT_URL=https://YOUR-DOMAIN
GOOGLE_REDIRECT_URI=https://YOUR-DOMAIN/api/google/callback
```

Add the same redirect URI in Google Cloud Console.

## Initial owner

Run once:

```bash
npm run seed
```

Change the initial password immediately after adding a password-change screen or update it directly in the database through a secure administrative process.

## Security checklist

- Use long random values for JWT and webhook secrets.
- Use a 64-character hexadecimal Google token encryption key.
- Restrict CORS to your production domain.
- Keep MongoDB IP/network rules tight.
- Use HTTPS only.
- Do not put OAuth secrets or webhook secrets in the React frontend.
- Rotate credentials after any suspected exposure.
- Back up MongoDB and Google Calendar data.
