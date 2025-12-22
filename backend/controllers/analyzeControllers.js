import { db } from "../index.js"; 
import { classifyFromLink, classifyFromPdf } from "../services/huggingFaceServices.js"; 
import fs from 'fs';

// 1. Controller for URL Analysis
export const analyzeUrl = async (req, res) => {
  const { url, userId } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    console.log(`🔎 Analyzing URL: ${url}`);
    
    // Call the AI Service
    const analysisResult = await classifyFromLink(url);

    // 🛑 SAFETY CHECK
    if (!analysisResult || !analysisResult.success) {
      console.warn("⚠️ AI Analysis failed or model is sleeping. Skipping DB save.");
      return res.status(503).json({ 
        success: false,
        error: "Model is waking up. Please try again in 30 seconds.",
        details: analysisResult?.error 
      });
    }

    // ✅ FIXED: Handle Anonymous User
    // If userId exists, use it. If not, use NULL (not 'anonymous')
    const user = userId ? parseInt(userId) : null;

    const query = `
      INSERT INTO history (url, result, confidence, user_id, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *;
    `;

    const savedRecord = await db.query(query, [
      url, 
      analysisResult.label,       
      analysisResult.confidence, 
      user // This is now an Integer or Null
    ]);

    res.json({
      success: true,
      data: {
        ...analysisResult,
        savedId: savedRecord.rows[0].id
      }
    });

  } catch (error) {
    console.error("❌ Controller Error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 2. Controller for PDF Analysis
export const analyzePdf = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No PDF file uploaded" });
  }

  try {
    const filePath = req.file.path;
    console.log(`📄 Analyzing PDF: ${filePath}`);

    const analysisResult = await classifyFromPdf(filePath);

    // Clean up file
    if (fs.existsSync(filePath)) {
       fs.unlinkSync(filePath);
    }

    // 🛑 SAFETY CHECK
    if (!analysisResult || !analysisResult.success) {
      return res.status(422).json({ 
        success: false,
        error: "PDF analysis failed. " + (analysisResult?.error || "")
      });
    }

    // ✅ FIXED: Handle Anonymous User
    const user = req.body.userId ? parseInt(req.body.userId) : null;
    
    const query = `
      INSERT INTO history (url, result, confidence, user_id, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *;
    `;

    // Note: We save "PDF Upload" as the URL placeholder
    const savedRecord = await db.query(query, [
      "PDF Upload", 
      analysisResult.label,
      analysisResult.confidence,
      user
    ]);

    res.json({
      success: true,
      data: {
        ...analysisResult,
        savedId: savedRecord.rows[0].id
      }
    });

  } catch (error) {
    console.error("❌ PDF Controller Error:", error);
    res.status(500).json({ error: "Failed to process PDF" });
  }
};