import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import googleRoutes from "./routes/googleRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import reminderRoutes from "./routes/reminderRoutes.js";

import { errorHandler, notFound } from "./middleware/error.js";
import { ensureInitialData } from "./services/bootstrap.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Database and initial application data
 */
await connectDB();
await ensureInitialData();

/**
 * Render runs behind a reverse proxy.
 */
app.set("trust proxy", 1);

/**
 * Security headers
 */
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

/**
 * CORS
 *
 * CLIENT_URL may contain one or more comma-separated URLs.
 */
const allowedOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow server-to-server requests, health checks, and local development.
      if (!origin || process.env.NODE_ENV === "development") {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin is not allowed by CORS."));
    },
    credentials: true,
  })
);

/**
 * Request parsing and logging
 */
app.use(express.json({ limit: "1mb" }));
app.use(
  morgan(process.env.NODE_ENV === "production" ? "combined" : "dev")
);

/**
 * API rate limiting
 */
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 500,
    standardHeaders: true,
    legacyHeaders: false,

    // The external scheduler may call this endpoint regularly.
    skip: (req) => req.path === "/reminders/run",
  })
);

/**
 * Health check used by Render
 */
app.get("/api/health", (req, res) => {
  return res.status(200).json({
    ok: true,
    time: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",

    emailConfigured: Boolean(
      process.env.EMAIL_ENABLED === "true" &&
      process.env.RESEND_API_KEY &&
      process.env.RESEND_FROM
    ),

    googleCalendarEnabled:
      process.env.GOOGLE_CALENDAR_ENABLED === "true",
  });
});

/**
 * API routes
 */
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/users", userRoutes);
app.use("/api/google", googleRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/reminders", reminderRoutes);

/**
 * Production React frontend
 *
 * index.js:
 *   server/src/index.js
 *
 * React build:
 *   client/dist
 *
 * From server/src, the correct relative path is:
 *   ../../client/dist
 */
if (process.env.NODE_ENV === "production") {
  const clientDistPath = path.resolve(
    __dirname,
    "../../client/dist"
  );

  const clientAssetsPath = path.join(
    clientDistPath,
    "assets"
  );

  const clientIndexPath = path.join(
    clientDistPath,
    "index.html"
  );

  console.log("Production frontend directory:", clientDistPath);
  console.log("Production index file:", clientIndexPath);

  if (!fs.existsSync(clientIndexPath)) {
    console.error(
      `React production build was not found at: ${clientIndexPath}`
    );
  }

  /**
   * Serve Vite's generated JS and CSS files.
   *
   * A missing asset must return 404 instead of falling through
   * to index.html or the JSON API error handler.
   */
  app.use(
    "/assets",
    express.static(clientAssetsPath, {
      immutable: true,
      maxAge: "1y",
      fallthrough: false,
    })
  );

  /**
   * Serve other static files such as favicon and manifest.
   */
  app.use(
    express.static(clientDistPath, {
      index: false,
      maxAge: "1h",
    })
  );

  /**
   * React Router SPA fallback.
   *
   * This must remain after every /api route and every static route.
   */
  app.get("/{*splat}", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return next();
    }

    // Never return index.html for a missing asset.
    if (req.path.startsWith("/assets/")) {
      return res.status(404).send("Frontend asset not found.");
    }

    if (!fs.existsSync(clientIndexPath)) {
      return res.status(500).json({
        message: "React production build is missing.",
        expectedPath: clientIndexPath,
      });
    }

    return res.sendFile(clientIndexPath);
  });
}

/**
 * API 404 and centralized error handling
 */
app.use(notFound);
app.use(errorHandler);

/**
 * Render supplies PORT automatically.
 */
const port = Number(process.env.PORT) || 5000;

app.listen(port, "0.0.0.0", () => {
  console.log(`Argo Calendar API running on port ${port}`);
});