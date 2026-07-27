# Google OAuth and Calendar setup

1. Open Google Cloud Console and create/select a project.
2. Enable **Google Calendar API**.
3. Configure the OAuth consent screen.
4. Create an **OAuth 2.0 Client ID** of type **Web application**.
5. Add these redirect URIs:
   - Development: `http://localhost:5000/api/google/callback`
   - Production: `https://YOUR-SERVER-DOMAIN/api/google/callback`
6. Put the client ID, client secret, and exact redirect URI in `server/.env`.
7. Generate the encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

8. Sign in as OWNER and open **Settings → Connect Google Calendar**.
9. Authorize the HR Google account.

The backend requests offline access and stores the refresh token encrypted with AES-256-GCM. Never commit `.env` or a refresh token.
