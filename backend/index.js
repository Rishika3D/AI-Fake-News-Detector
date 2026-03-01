import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import db from './db/db.js';
import analyzeRoutes from './routes/analyzeRoutes.js';
import authRoutes from './routes/userRoutes.js';
import { authLimiter } from './middleware/rateLimiter.js';
import { startWorker } from './workers/analyzeWorker.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

// HTTP request logger — 'combined' (Apache format) in prod, 'dev' (coloured) locally
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Allow requests from the deployed frontend and local dev simultaneously
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];
app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

/* ================= ROUTES ================= */
app.get('/', (_req, res) => res.status(200).send("Backend is running ✅"));
app.use('/api/auth',    authLimiter, authRoutes);
app.use('/api/analyze', analyzeRoutes);

/* ================= STARTUP ================= */
async function start() {
  // Auto-create all tables — idempotent, safe to run on every boot
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL      PRIMARY KEY,
      username      VARCHAR(50) UNIQUE NOT NULL,
      email         VARCHAR(100) UNIQUE NOT NULL,
      password_hash TEXT        NOT NULL,
      created_at    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS history (
      id          SERIAL      PRIMARY KEY,
      user_id     INT         REFERENCES users(id) ON DELETE SET NULL,
      url         TEXT,
      result      TEXT,
      confidence  FLOAT,
      created_at  TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      type          VARCHAR(10) NOT NULL CHECK (type IN ('url', 'pdf')),
      input         TEXT        NOT NULL,
      user_id       INT         REFERENCES users(id) ON DELETE SET NULL,
      status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'processing', 'done', 'error')),
      result        JSONB,
      error_message TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
  `);

  // ── Schema migrations — safe to run on every boot ──────────────────────────
  // These are all idempotent: ADD COLUMN IF NOT EXISTS / DROP COLUMN IF EXISTS
  // are no-ops when the column already is / isn't there.
  await db.query(`
    -- Remove stale columns from a previous project's users table
    ALTER TABLE users DROP COLUMN IF EXISTS name;
    ALTER TABLE users DROP COLUMN IF EXISTS color;

    -- Ensure all required auth columns exist
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS username      VARCHAR(50),
      ADD COLUMN IF NOT EXISTS email         VARCHAR(100),
      ADD COLUMN IF NOT EXISTS password_hash TEXT,
      ADD COLUMN IF NOT EXISTS created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  `);

  console.log("✅ Database tables ready");

  startWorker();

  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
