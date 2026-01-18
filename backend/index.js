import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './db/db.js'; 

// 2. Import Both Route Files
import analyzeRoutes from './routes/analyzeRoutes.js';
import authRoutes from './routes/userRoutes.js'; // You were missing this!

/* ================= LOAD ENV ================= */
dotenv.config();

/* ================= APP SETUP ================= */
const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors({
  origin: "http://localhost:5173", // Your Frontend URL
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

/* ================= ROUTES ================= */

// Test Route
app.get('/', (req, res) => {
  res.status(200).send("Backend is running ✅");
});

// Auth Routes -> /api/auth/login, /api/auth/signup
app.use('/api/auth', authRoutes);

// Analyze Routes -> /api/analyze/url, /api/analyze/pdf, /api/analyze/history
app.use('/api/analyze', analyzeRoutes);

/* ================= START SERVER ================= */
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});