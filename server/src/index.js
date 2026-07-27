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
 * Database and initial data
 */
await connectDB();
await ensureInitialData();

/**
 * Render reverse proxy
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
 */
const allowedOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
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
    skip: (req) => req.path === "/reminders/run",
  })
);

/**
 * Health check
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

  console.log("Current working directory:", process.cwd());
  console.log("Serving React frontend from:", clientDistPath);
  console.log("React index exists:", fs.existsSync(clientIndexPath));
  console.log(
    "Assets directory exists:",
    fs.existsSync(clientAssetsPath)
  );

  if (fs.existsSync(clientAssetsPath)) {
    console.log(
      "Frontend asset files:",
      fs.readdirSync(clientAssetsPath)
    );
  }

  app.use(
    "/assets",
    express.static(clientAssetsPath, {
      index: false,
      immutable: true,
      maxAge: "1y",
      fallthrough: false,
    })
  );

  app.use(
    express.static(clientDistPath, {
      index: false,
      setHeaders(res, filePath) {
        if (filePath.endsWith("index.html")) {
          res.setHeader(
            "Cache-Control",
            "no-store, no-cache, must-revalidate"
          );
        }
      },
    })
  );

  app.get("/{*splat}", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return next();
    }

    if (req.path.startsWith("/assets/")) {
      return res
        .status(404)
        .type("text/plain")
        .send(`Frontend asset not found: ${req.path}`);
    }

    if (!fs.existsSync(clientIndexPath)) {
      return res.status(500).json({
        message: "React production build is missing.",
        expectedPath: clientIndexPath,
      });
    }

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate"
    );

    return res.sendFile(clientIndexPath);
  });
}

/**
 * API 404 and centralized error handling
 */
app.use(notFound);
app.use(errorHandler);

/**
 * Start server
 */
const port = Number(process.env.PORT) || 5000;

app.listen(port, "0.0.0.0", () => {
  console.log(`Argo Calendar API running on port ${port}`);
});