import db from "../db/db.js";
import { classifyFromLink } from "../services/huggingFaceServices.js"; 
import { exportTextFromPdf } from "../services/pdfService.js";
import { Client } from "@gradio/client";
import fs from 'fs';

// 1. URL Analysis
export const analyzeUrl = async (req, res) => {
  const { url, userId } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const analysisResult = await classifyFromLink(url);
    if (!analysisResult?.success) {
      return res.status(503).json({ success: false, error: "AI model is busy." });
    }

    const user = userId ? parseInt(userId) : null;
    const query = `INSERT INTO history (url, result, confidence, user_id, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id;`;
    const savedRecord = await db.query(query, [url, analysisResult.label, analysisResult.confidence, user]);

    res.json({ success: true, data: { ...analysisResult, savedId: savedRecord.rows[0].id } });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 2. PDF Analysis
export const analyzePdf = async (req, res) => {
  console.log("📥 PDF Request Received"); // This MUST show in terminal
  
  if (!req.file) {
    console.log("❌ No file found in req.file");
    return res.status(400).json({ error: "No PDF file uploaded" });
  }

  const filePath = req.file.path;
  try {
    const extractedText = await exportTextFromPdf(filePath);
    console.log("📝 Extracted Text length:", extractedText.length);
    
    // ... rest of logic
  } catch (error) {
    console.error("💥 CRITICAL CONTROLLER ERROR:", error); // This will show the full stack trace
    res.status(500).json({ success: false, error: error.message });
  }
};

// 3. History Fetch
export const getHistory = async (req, res) => {
  try {
    const query = `SELECT id, url, result as label, confidence, created_at FROM history ORDER BY created_at DESC LIMIT 20;`;
    const historyData = await db.query(query);
    res.json({ success: true, data: historyData.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to load history" });
  }
};