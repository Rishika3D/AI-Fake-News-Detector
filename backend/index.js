import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import analyzeRoutes from './routes/analyzeRoutes.js';
import pg from 'pg';

/* ================= LOAD ENV FIRST ================= */
dotenv.config();

/* ================= DB ================= */
export const db = new pg.Client({
  user: process.env.PGUSER,
  host: process.env.PGHOST || "localhost",
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT || 5432,
});

db.connect()
  .then(() => console.log("📦 Connected to PostgreSQL"))
  .catch((err) => console.error("❌ DB Connection Error:", err));

/* ================= APP ================= */
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send("Backend running ✅");
});

/* ================= ROUTES ================= */
app.use('/api/analyze', analyzeRoutes);


app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
