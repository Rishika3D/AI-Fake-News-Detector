import axios from "axios";
import { extractTextFromLink } from "./textExtractor.js"; 
import { exportTextFromPdf } from "./pdfService.js"; // ⬅️ Uncommented this!

const LOCAL_AI_URL = "http://localhost:8000/predict_text";

/**
 * 🧹 Helper: Clean confidence score to number
 */
function parseConfidence(rawScore) {
  if (!rawScore) return 0;
  // Handle "98.5%", "0.98", or 98.5
  let strScore = String(rawScore).replace('%', '');
  let scoreNum = Number(strScore);
  
  // Normalize decimals (0.98 -> 98.0)
  if (scoreNum <= 1 && scoreNum > 0) scoreNum = scoreNum * 100;
  
  return isNaN(scoreNum) ? 0 : scoreNum;
}

/**
 * 🧠 Helper: Talk to the Python AI Server
 */
async function queryLocalAi(text) {
  try {
    console.log(`🧠 Sending ${text.length} chars to Local AI...`);
    const response = await axios.post(LOCAL_AI_URL, { text });
    return response.data;
  } catch (error) {
    console.error("❌ AI Service Error:", error.message);
    return { label: "Uncertain", confidence: 0 };
  }
}

/* ================= EXPORTED FUNCTIONS ================= */

export async function classifyFromLink(url) {
  try {
    console.log(`🌍 Scraping: ${url}`);
    
    // 1. Scrape
    let scrapedText = await extractTextFromLink(url);

    // 🤡 2. CHECK FOR SATIRE FLAG
    if (scrapedText === "SATIRE_CONTENT_DETECTED") {
        return {
            success: true,
            label: "SATIRE",
            confidence: "100.00",
            snippet: "This source is a known satire/comedy website. Content is fictional."
        };
    }

    // 3. Safety Check
    if (!scrapedText || scrapedText.length < 50) {
      return { success: false, error: "Could not read text from website." };
    }

    // 4. Truncate (Don't crash server with huge text)
    if (scrapedText.length > 5000) scrapedText = scrapedText.slice(0, 5000);

    // 5. Predict
    const prediction = await queryLocalAi(scrapedText);
    const finalScore = parseConfidence(prediction.confidence);

    const finalResult = {
      success: true,
      label: prediction.label || "Uncertain",
      confidence: finalScore.toFixed(2), 
      snippet: scrapedText.slice(0, 200).replace(/\n/g, " ") + "..."
    };

    console.log("🚀 BACKEND SENDING:", finalResult);
    return finalResult;

  } catch (err) {
    console.error("🔥 CRITICAL BACKEND ERROR:", err.message);
    return { success: false, error: err.message };
  }
}

// 📄 RESTORED PDF FUNCTION
export async function classifyFromPdf(path) {
    try {
        console.log(`📄 Analyzing PDF: ${path}`);
        const text = await exportTextFromPdf(path);
        
        if (!text || text.trim().length < 10) throw new Error("PDF content is empty.");
        
        // Truncate huge PDFs
        const cleanText = text.length > 5000 ? text.slice(0, 5000) : text;
        
        const prediction = await queryLocalAi(cleanText);
        const finalScore = parseConfidence(prediction.confidence);

        return {
            success: true,
            label: prediction.label || "Uncertain",
            confidence: finalScore.toFixed(2),
            snippet: cleanText.slice(0, 150).replace(/\n/g, " ") + "..."
        };
    } catch (err) {
        console.error("❌ classifyFromPdf Error:", err.message);
        return { success: false, error: err.message };
    }
}