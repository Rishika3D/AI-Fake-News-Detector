import db from "../db/db.js";
import { classifyFromLink, classifyFromPdf } from "../services/huggingFaceServices.js";
import fs from "fs/promises";

const POLL_INTERVAL_MS = 3000; // check for new jobs every 3 s

async function processJob(job) {
  let result;
  try {
    if (job.type === "url") {
      result = await classifyFromLink(job.input);
    } else {
      result = await classifyFromPdf(job.input);
      // Always clean up the uploaded file after processing
      await fs.unlink(job.input).catch(() => {});
    }

    if (!result?.success) {
      throw new Error(result?.error || "Analysis returned no result.");
    }

    // Persist to history
    await db.query(
      `INSERT INTO history (url, result, confidence, user_id, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [job.input, result.label, result.confidence, job.user_id]
    );

    await db.query(
      `UPDATE jobs SET status = 'done', result = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(result), job.id]
    );
  } catch (err) {
    // Clean up PDF even on failure
    if (job.type === "pdf") await fs.unlink(job.input).catch(() => {});

    await db.query(
      `UPDATE jobs SET status = 'error', error_message = $1, updated_at = NOW() WHERE id = $2`,
      [err.message, job.id]
    );
  }
}

async function tick() {
  // SKIP LOCKED lets multiple worker instances pick different jobs safely
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT * FROM jobs
       WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`
    );

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return;
    }

    const job = rows[0];
    await client.query(
      `UPDATE jobs SET status = 'processing', updated_at = NOW() WHERE id = $1`,
      [job.id]
    );
    await client.query("COMMIT");

    // Do the heavy work outside the transaction so we don't hold the lock
    await processJob(job);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Worker tick error:", err.message);
  } finally {
    client.release();
  }
}

export function startWorker() {
  console.log("🔧 Analysis worker started (polling every 3s)");

  function schedule() {
    tick().finally(() => setTimeout(schedule, POLL_INTERVAL_MS));
  }
  schedule();
}
