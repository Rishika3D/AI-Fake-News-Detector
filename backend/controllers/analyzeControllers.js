import db from "../db/db.js";
import fs from "fs/promises";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const JOB_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// POST /api/analyze/url
// Queues a URL analysis job and returns jobId immediately (202 Accepted).
export const analyzeUrl = async (req, res) => {
  const { url, userId } = req.body;
  const user = userId ? parseInt(userId, 10) : null;

  try {
    const { rows } = await db.query(
      `INSERT INTO jobs (type, input, user_id) VALUES ('url', $1, $2) RETURNING id`,
      [url, user]
    );
    res.status(202).json({ success: true, jobId: rows[0].id });
  } catch (err) {
    console.error("analyzeUrl error:", err.message);
    res.status(500).json({ error: "Failed to queue analysis." });
  }
};

// POST /api/analyze/pdf
// Accepts a PDF upload, queues it, and returns jobId immediately (202 Accepted).
export const analyzePdf = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No PDF file uploaded." });
  }

  const { userId } = req.body;
  const user = userId ? parseInt(userId, 10) : null;

  try {
    const { rows } = await db.query(
      `INSERT INTO jobs (type, input, user_id) VALUES ('pdf', $1, $2) RETURNING id`,
      [req.file.path, user]
    );
    res.status(202).json({ success: true, jobId: rows[0].id });
  } catch (err) {
    // Clean up the uploaded file if we couldn't even save the job
    await fs.unlink(req.file.path).catch(() => {});
    console.error("analyzePdf error:", err.message);
    res.status(500).json({ error: "Failed to queue analysis." });
  }
};

// GET /api/analyze/jobs/:jobId
// Polled by the frontend to check job progress.
export const getJob = async (req, res) => {
  const { jobId } = req.params;

  if (!UUID_RE.test(jobId)) {
    return res.status(400).json({ error: "Invalid job ID." });
  }

  try {
    const { rows } = await db.query(
      `SELECT id, status, result, error_message, created_at FROM jobs WHERE id = $1`,
      [jobId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Job not found." });
    }

    const job = rows[0];

    // Treat jobs stuck in pending/processing longer than timeout as failed
    const ageMs = Date.now() - new Date(job.created_at).getTime();
    if (["pending", "processing"].includes(job.status) && ageMs > JOB_TIMEOUT_MS) {
      return res.json({ success: true, status: "error", error: "Analysis timed out." });
    }

    res.json({
      success: true,
      status:  job.status,
      data:    job.result,
      error:   job.error_message,
    });
  } catch (err) {
    console.error("getJob error:", err.message);
    res.status(500).json({ error: "Failed to fetch job status." });
  }
};

// GET /api/analyze/history
export const getHistory = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, url, result AS label, confidence, created_at
       FROM history
       ORDER BY created_at DESC
       LIMIT 20`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("getHistory error:", err.message);
    res.status(500).json({ success: false, error: "Failed to load history." });
  }
};
