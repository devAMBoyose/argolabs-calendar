import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import userRoutes from './routes/userRoutes.js';
import googleRoutes from './routes/googleRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import reminderRoutes from './routes/reminderRoutes.js';
import { errorHandler, notFound } from './middleware/error.js';
import { ensureInitialData } from './services/bootstrap.js';

const app = express();
await connectDB();
await ensureInitialData();

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin is not allowed by CORS.'));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 500,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/reminders/run',
  })
);

app.get('/api/health', (req, res) =>
  res.json({
    ok: true,
    time: new Date().toISOString(),
    emailConfigured: Boolean(
      process.env.EMAIL_ENABLED === 'true' &&
      process.env.RESEND_API_KEY &&
      process.env.RESEND_FROM
    ),
    googleCalendarEnabled: process.env.GOOGLE_CALENDAR_ENABLED === 'true',
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/users', userRoutes);
app.use('/api/google', googleRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/reminders', reminderRoutes);

if (process.env.NODE_ENV === 'production') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const dist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(dist));
  app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(dist, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Argo Calendar API running on ${port}`);
});
