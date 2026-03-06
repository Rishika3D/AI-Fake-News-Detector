# VeriNews — AI Fake News Detector

A full-stack web application that uses zero-shot AI classification to detect misinformation, fake news, and satire from URLs or uploaded PDF documents.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Running Tests](#running-tests)
- [Deployment](#deployment)
- [Project Structure](#project-structure)

---

## Overview

VeriNews scrapes a news article from any URL (or reads an uploaded PDF), sends the text to the `facebook/bart-large-mnli` zero-shot classification model via the Hugging Face Inference API, and returns a verdict — **Trusted**, **Fake**, or **Satire** — with a confidence score.

Analysis runs asynchronously via a PostgreSQL-backed job queue, so the API never blocks and multiple requests process concurrently.

---

## Features

- **Zero-shot AI classification** — `facebook/bart-large-mnli` classifies articles without any task-specific fine-tuning
- **Async job queue** — PostgreSQL `FOR UPDATE SKIP LOCKED` pattern; no Redis needed
- **Domain blacklist** — 25+ known misinformation outlets (InfoWars, NaturalNews, etc.) are flagged instantly at 100% confidence without hitting the AI model
- **Satire detection** — Known satire sites (The Onion, Babylon Bee, etc.) are identified immediately
- **Web scraping** — Puppeteer (with stealth plugin) as primary scraper; Axios + Cheerio as fallback
- **PDF support** — Upload a PDF document for analysis using `pdfjs-dist`
- **JWT authentication** — Signup/login with bcrypt password hashing and JWT tokens
- **Rate limiting** — 10 req/min on analyze endpoints, 20 req/15min on auth
- **Input validation** — URL format, protocol, and length validation middleware
- **Analysis history** — Last 20 analyses stored per session
- **Step-by-step progress UI** — Frontend shows Queue → Scrape → AI model progress in real time
- **19 automated tests** — Unit tests for validation + integration tests with mocked DB

---

## Tech Stack

### Frontend
| Technology | Version |
|---|---|
| React | 19.2 |
| Vite | 7.2 |
| Tailwind CSS | 4.1 |
| Framer Motion | 12.x |
| React Router | 7.x |
| Lucide React | 0.553 |

### Backend
| Technology | Version |
|---|---|
| Node.js | ≥ 20 |
| Express | 5.1 |
| PostgreSQL (pg) | 8.x |
| jsonwebtoken | 9.x |
| bcrypt | 6.x |
| Multer | 2.x |
| Puppeteer | 24.x |
| pdfjs-dist | 5.x |
| express-rate-limit | 8.x |
| Morgan | 1.x |
| Jest + Supertest | 30.x |

### ML Service (local dev only)
| Technology | Details |
|---|---|
| Python / Flask | Local inference server |
| facebook/bart-large-mnli | Zero-shot NLI classification |
| HuggingFace Transformers | Model loading |
| PyTorch | Backend tensor operations |

---

## Architecture

```
┌─────────────────┐        ┌──────────────────────────────────────────┐
│   React Frontend │        │              Express Backend              │
│   (Vite / SPA)  │        │                                          │
│                 │  HTTP  │  /api/auth    → userController            │
│  InsertData.jsx │◄──────►│  /api/analyze → analyzeControllers       │
│  AuthPage.jsx   │        │                                          │
│  History.jsx    │        │  Middleware:                             │
└─────────────────┘        │    rateLimiter, validateUrl, multer      │
                           │                                          │
                           │  Worker (polls every 3s):               │
                           │    analyzeWorker.js                      │
                           │      ↓                                   │
                           │    textExtractor.js (Puppeteer/Axios)    │
                           │      ↓                                   │
                           │    huggingFaceServices.js                │
                           │      ↓ (production)                      │
                           │    HF Inference API                      │
                           │      ↓ (local dev)                       │
                           │    Flask ML server :8000                 │
                           └──────────────┬───────────────────────────┘
                                          │
                                    ┌─────▼─────┐
                                    │ PostgreSQL │
                                    │  users     │
                                    │  jobs      │
                                    │  history   │
                                    └───────────┘
```

### Job Queue Flow

```
POST /api/analyze/url
        │
        ▼
  INSERT INTO jobs (status='pending')
        │
        ▼
  202 Accepted + { jobId }
        │
  [Frontend polls GET /jobs/:jobId every 2s]
        │
        ▼
  Worker picks up job (FOR UPDATE SKIP LOCKED)
        │
        ├─ Domain in blacklist? → FAKE (100% confidence, instant)
        ├─ Domain is satire?    → SATIRE (100% confidence, instant)
        └─ Otherwise:
              │
              ├─ Scrape with Puppeteer
              │   └─ Fallback: Axios + Cheerio
              │
              └─ POST to HF Inference API
                    │
                    ▼
              UPDATE jobs SET status='done', result={...}
              INSERT INTO history
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- PostgreSQL
- Python 3.9+ (local dev ML only)
- A free [Hugging Face](https://huggingface.co/settings/tokens) API token

### 1. Clone the repo

```bash
git clone https://github.com/Rishika3D/AI-Fake-News-Detector.git
cd AI-Fake-News-Detector
```

### 2. Set up the backend

```bash
cd backend
cp .env.example .env       # fill in your values
npm install
node index.js              # auto-creates all DB tables on first run
```

### 3. Set up the frontend

```bash
cd frontend
cp .env.example .env       # set VITE_API_URL if needed
npm install
npm run dev
```

### 4. (Optional) Run the local ML service

Only needed if you don't have a `HF_ACCESS_TOKEN`. Requires ~4 GB RAM.

```bash
cd fake-news-detector-v2
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 app.py             # runs on port 8000
```

The backend automatically falls back to `localhost:8000` when `HF_ACCESS_TOKEN` is not set.

### 5. Open the app

```
http://localhost:5173
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: 5050) |
| `NODE_ENV` | No | Set to `production` on Render |
| `DATABASE_URL` | Prod | Full PostgreSQL connection string (Render/Neon/Railway) |
| `DB_USER` | Dev | PostgreSQL user (local dev alternative) |
| `DB_HOST` | Dev | PostgreSQL host |
| `DB_NAME` | Dev | Database name |
| `DB_PASSWORD` | Dev | Database password |
| `DB_PORT` | Dev | PostgreSQL port (default: 5432) |
| `JWT_SECRET` | **Yes** | Long random string for signing tokens |
| `JWT_EXPIRES_IN` | No | Token lifetime (default: `7d`) |
| `HF_ACCESS_TOKEN` | Prod | Hugging Face token for Inference API |
| `FRONTEND_URL` | Prod | Deployed frontend URL for CORS (e.g. `https://verinews.vercel.app`) |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Prod | Backend API base URL (e.g. `https://verinews-backend.onrender.com/api/analyze`) |

---

## API Reference

### Auth

#### `POST /api/auth/signup`
```json
{ "username": "alice", "email": "alice@example.com", "password": "secret" }
```
Returns `201` with `{ user: { id, username, email } }`

#### `POST /api/auth/login`
```json
{ "email": "alice@example.com", "password": "secret" }
```
Returns `200` with `{ token, user: { id, username, email } }`

---

### Analyze

#### `POST /api/analyze/url`
```json
{ "url": "https://bbc.com/news/article", "userId": 1 }
```
Returns `202` with `{ jobId: "uuid" }`

#### `POST /api/analyze/pdf`
`multipart/form-data` with `file` field (PDF, max 10 MB).
Returns `202` with `{ jobId: "uuid" }`

#### `GET /api/analyze/jobs/:jobId`

Returns current job state:
```json
{
  "success": true,
  "status": "done",
  "data": {
    "label": "TRUSTED",
    "confidence": "87.30",
    "snippet": "Article text preview..."
  }
}
```

| `status` | Meaning |
|---|---|
| `pending` | Waiting in queue |
| `processing` | Being scraped / classified |
| `done` | Result available in `data` |
| `error` | Failed — reason in `error` field |

#### `GET /api/analyze/history`
Returns last 20 analyses ordered by date.

---

## Database Schema

```sql
CREATE TABLE users (
  id            SERIAL      PRIMARY KEY,
  username      VARCHAR(50) UNIQUE NOT NULL,
  email         VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMP   DEFAULT NOW()
);

CREATE TABLE jobs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type          VARCHAR(10) NOT NULL CHECK (type IN ('url', 'pdf')),
  input         TEXT        NOT NULL,
  user_id       INT         REFERENCES users(id) ON DELETE SET NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','processing','done','error')),
  result        JSONB,
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE history (
  id          SERIAL    PRIMARY KEY,
  user_id     INT       REFERENCES users(id) ON DELETE SET NULL,
  url         TEXT,
  result      TEXT,
  confidence  FLOAT,
  created_at  TIMESTAMP DEFAULT NOW()
);
```

Tables are auto-created on server startup — no manual migration step needed.

---

## Running Tests

```bash
cd backend
npm test
```

**19 tests across 2 suites:**

| Suite | Tests |
|---|---|
| `validate.test.js` | Valid http URL, valid https URL, missing URL, empty string, non-string, malformed URL, ftp:// rejected, URL > 2048 chars rejected |
| `api.test.js` | POST /url missing URL, invalid URL, FTP blocked, valid URL returns 202, DB failure → 500, GET /jobs malformed UUID, 404, pending status, done with result, GET /history success, DB error |

---

## Deployment

This project is configured for **Frontend → Vercel** and **Backend → Render**.

### Frontend on Vercel

1. Import the repo on [vercel.com](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Framework preset: **Vite** (auto-detected)
4. Add environment variable:
   - `VITE_API_URL` = `https://<your-render-backend>.onrender.com/api/analyze`

### Backend on Render

Use the included `render.yaml` for one-click deploy:

1. New → **Blueprint** → connect repo → Render reads `render.yaml` automatically
2. Set secrets in the Render dashboard:
   - `HF_ACCESS_TOKEN` — from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
   - `FRONTEND_URL` — your Vercel URL
3. The free PostgreSQL database is provisioned automatically

### Wire them together

After both are deployed:
- Copy your **Vercel URL** → add as `FRONTEND_URL` in Render env vars
- Copy your **Render backend URL** → add as `VITE_API_URL` in Vercel env vars
- Redeploy both services once

---

## Project Structure

```
AI-Fake-News-Detector/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── InsertData.jsx      # Main analyzer UI + polling
│   │   │   ├── AuthPage.jsx        # Login / signup
│   │   │   ├── History.jsx         # Past analyses
│   │   │   └── ConfidenceScore.jsx # Stub component
│   │   ├── App.jsx                 # Router + dashboard
│   │   └── App.css                 # Theme + holographic cursor
│   ├── vercel.json                 # SPA routing rewrites
│   ├── vite.config.js
│   └── package.json
│
├── backend/
│   ├── controllers/
│   │   ├── analyzeControllers.js   # Job queue, status polling, history
│   │   └── userController.js       # Signup, login
│   ├── db/
│   │   └── db.js                   # pg.Pool (DATABASE_URL or individual vars)
│   ├── middleware/
│   │   ├── rateLimiter.js          # Per-IP rate limits
│   │   └── validate.js             # URL validation
│   ├── routes/
│   │   ├── analyzeRoutes.js
│   │   └── userRoutes.js
│   ├── services/
│   │   ├── huggingFaceServices.js  # HF API + local Flask fallback
│   │   ├── textExtractor.js        # Puppeteer/Axios scraper + domain lists
│   │   └── pdfService.js           # PDF text extraction
│   ├── workers/
│   │   └── analyzeWorker.js        # Background job processor
│   ├── tests/
│   │   ├── api.test.js             # Integration tests
│   │   └── validate.test.js        # Unit tests
│   ├── index.js                    # Server entry, table creation, worker start
│   ├── jest.config.js
│   ├── .env.example
│   └── package.json
│
├── fake-news-detector-v2/
│   ├── app.py                      # Flask ML server (local dev)
│   └── requirements.txt
│
├── render.yaml                     # One-click Render deployment
└── README.md
```

---

## Known Limitations

- **Puppeteer on Render free tier** — 512 MB RAM can cause timeouts on JavaScript-heavy sites; Axios fallback handles most cases
- **HF Inference API cold starts** — The model may take 20–30 seconds to load on the first request after inactivity
- **Domain blacklist is static** — Known misinformation domains are hardcoded; no real-time reputation lookup
- **No auth middleware on analyze routes** — `userId` is optional; analysis works without login
