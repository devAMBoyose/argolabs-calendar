# Argo Calendar: first deployment order

## 1. Create MongoDB Atlas

1. Create a Free Atlas cluster.
2. Create a database user and password.
3. Add `0.0.0.0/0` to Network Access for a simple Render demo deployment.
4. Copy the Node.js connection string and add `/argo_calendar` as the database name.

Example:

```text
mongodb+srv://USERNAME:PASSWORD@cluster.example.mongodb.net/argo_calendar?retryWrites=true&w=majority
```

URL-encode special characters in the database password.

## 2. Upload this project to GitHub

Do not upload `.env` or `node_modules`.

```bash
git init
git add .
git commit -m "Deploy Argo Calendar"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

## 3. Deploy using Render Blueprint

1. In Render, choose **New > Blueprint**.
2. Connect the GitHub repository.
3. Render reads `render.yaml` automatically.
4. Enter these required values:

- `MONGODB_URI`: Atlas connection string
- `OWNER_EMAIL`: login email
- `OWNER_PASSWORD`: login password with at least 12 characters
- `CLIENT_URL`: final Render URL, such as `https://argo-calendar-portal.onrender.com`
- `APP_URL`: the same Render URL

The owner account and demo events are created automatically on first startup.

## 4. Test the deployment

Open `/api/health`, then open the main application and sign in with `OWNER_EMAIL` and `OWNER_PASSWORD`.

## 5. Enable Resend later

The portal works without email. For email:

1. Create a Resend API key.
2. In Render Environment, set:
   - `EMAIL_ENABLED=true`
   - `RESEND_API_KEY=re_...`
   - `RESEND_FROM=Argo Calendar <onboarding@resend.dev>` for testing to your own Resend account email
3. Redeploy.

To email arbitrary guests, verify a domain in Resend and replace `RESEND_FROM` with an address on that domain.

## 6. Configure automatic reminders last

Create an account at cron-job.org, then create a job:

- URL: `https://YOUR-RENDER-URL.onrender.com/api/reminders/run`
- Method: `POST`
- Schedule: once every hour
- Custom header: `x-reminder-secret: THE_REMINDER_SECRET_FROM_RENDER`

The job only calls the existing reminder endpoint. It does not store calendar data or email credentials.
