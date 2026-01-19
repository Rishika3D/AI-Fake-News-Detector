import axios from "axios";
import { extractTextFromLink } from "./textExtractor.js"; 
import { exportTextFromPdf } from "./pdfService.js";      

const LOCAL_AI_URL = "http://localhost:8000/predict_text";

/**
 * 🔄 MAPPING: SAFELY Handle Labels (Inverted Logic)
 * Label 0 (Fake) -> We map to "Real" (because model sees Formal Text as Label 0)
 * Label 1 (Real) -> We map to "Fake" (because model sees Fiction as Label 1)
 */
function mapLabelToCategory(label) {
  const normalized = label?.toString().toUpperCase().trim() || "UNCERTAIN";
  
  if (["FAKE", "LABEL_0", "0", "FALSE"].includes(normalized)) return "Real";
  if (["REAL", "LABEL_1", "1", "TRUE"].includes(normalized)) return "Fake";
  
  return "Uncertain";
}

async function queryLocalAi(text) {
  try {
    console.log(`🧠 Sending ${text.length} chars to Local AI...`);
    const response = await axios.post(LOCAL_AI_URL, { text });
    console.log("🤖 AI RAW RESPONSE:", response.data); 
    return response.data;
  } catch (error) {
    console.error("❌ AI Service Error:", error.message);
    return { label: "Uncertain", confidence: 0, error: true };
  }
}

/* ================= EXPORTED FUNCTIONS ================= */

export async function classifyFromLink(url) {
  try {
    console.log(`🌍 Scraping: ${url}`);
    
    // 1. Scrape
    let scrapedText = await extractTextFromLink(url);

    // 2. Safety Check
    if (!scrapedText || scrapedText.length < 50) {
      return { success: false, error: "Could not read text from website." };
    }

    // ✂️ CRITICAL FIX: Skip the first 1000 chars to avoid Legal Headers/Cookie Banners
    // This stops the AI from reading the "Project Gutenberg License" instead of the story.
    if (scrapedText.length > 2000) {
        console.log("✂️ Trimming header (first 1000 chars)...");
        scrapedText = scrapedText.slice(1000); 
    }

    // 3. Predict
    const prediction = await queryLocalAi(scrapedText);

    // 4. Handle Math (Confidence Score)
    let rawScore = prediction.confidence;
    let scoreNum = Number(rawScore || 0);
    
    // Normalize (0.98 -> 98.0)
    if (scoreNum <= 1 && scoreNum > 0) scoreNum = scoreNum * 100;

    const finalResult = {
      success: true,
      label: mapLabelToCategory(prediction.label),
      confidence: scoreNum.toFixed(2), 
      snippet: scrapedText.slice(0, 200) + "..."
    };

    // 🚨 DEBUG: Print what we are sending!
    console.log("🚀 BACKEND SENDING:", finalResult);

    return finalResult;

   

  } catch (err) {
    console.error("🔥 CRITICAL BACKEND ERROR:", err.message);
    return { success: false, error: err.message };
  }
}

export async function classifyFromPdf(path) {
    try {
        console.log(`📄 Analyzing PDF: ${path}`);
        const text = await exportTextFromPdf(path);
        
        if (!text || text.trim().length < 10) throw new Error("PDF content is empty.");
        
        const prediction = await queryLocalAi(text);
        
        // Same Safety Logic for PDF
        let rawScore = prediction.confidence;
        if (rawScore === undefined || rawScore === null) rawScore = 0;
        let scoreNum = Number(rawScore);
        if (isNaN(scoreNum)) scoreNum = 0;
        if (scoreNum <= 1 && scoreNum > 0) scoreNum = scoreNum * 100;

        return {
            success: true,
            label: mapLabelToCategory(prediction.label),
            confidence: scoreNum.toFixed(2),
            snippet: text.slice(0, 150) + "..."
        };
    } catch (err) {
        console.error("❌ classifyFromPdf Error:", err.message);
        return { success: false, error: err.message };
    }
}