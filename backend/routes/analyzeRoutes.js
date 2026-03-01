import express from "express";
import multer from "multer";
import { analyzeUrl, analyzePdf, getJob, getHistory } from "../controllers/analyzeControllers.js";
import { analyzeLimiter } from "../middleware/rateLimiter.js";
import { validateUrl } from "../middleware/validate.js";

const router = express.Router();

// Only allow PDF uploads under 10 MB
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are accepted."));
    }
  },
});

router.post("/url", analyzeLimiter, validateUrl, analyzeUrl);
router.post("/pdf", analyzeLimiter, upload.single("file"), analyzePdf);
router.get("/jobs/:jobId", getJob);
router.get("/history", getHistory);

// Handle multer errors (file too large, wrong type) gracefully
router.use((err, _req, res, _next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File too large. Maximum size is 10 MB." });
  }
  res.status(400).json({ error: err.message });
});

export default router;
