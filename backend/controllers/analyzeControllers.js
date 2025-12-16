import db from "../db/db.js";
import { classifyFromLink, classifyFromPdf } from "../services/huggingFaceServices.js";

// ------------------- URL ANALYSIS -------------------
export const analyzeUrl = async (req, res) => {
  try {
    const url = req.body.url || req.query.url;

    if (!url) {
      return res.status(400).json({ error: "URL is required." });
    }

    // 1. classify using HuggingFace service
    const result = await classifyFromLink(url);

    if (!result) {
      return res.status(500).json({ error: "Could not classify link." });
    }

    // 2. save to DB
    await db.query(
      `INSERT INTO history (input_type, input_value, result, confidence_score)
       VALUES ($1, $2, $3, $4)`,
      ["url", url, result.label, result.confidence]
    );

    // 3. send back result
    return res.json({
      label: result.label,
      confidence: result.confidence,
    });

  } catch (err) {
    console.error("URL analysis error:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
};


// ------------------- PDF ANALYSIS -------------------
export const analyzePdf = async (req, res) => {
  try {
    const filePath = req.file?.path;

    if (!filePath) {
      return res.status(400).json({ error: "PDF file is required." });
    }

    const result = await classifyFromPdf(filePath);

    if (!result) {
      return res.status(500).json({ error: "Could not classify PDF." });
    }

    await db.query(
      `INSERT INTO history (input_type, input_value, result, confidence_score, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      ["pdf", filePath, result.label, result.confidence, {}]
    );

    return res.json({
      label: result.label,
      confidence: result.confidence,
    });

  } catch (err) {
    console.error("PDF analysis error:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
};
