import axios from "axios";
import { extractTextFromLink } from "./textExtractor.js"; // Your Puppeteer scraper
import { exportTextFromPdf } from "./pdfService.js";      // Your PDF scraper

// 🚀 CHANGE: Point to your local Python Microservice instead of the Cloud Space
const LOCAL_AI_URL = "http://localhost:8000/predict_text";

/**
 * MAPPING: Converts model output labels to user-friendly categories.
 */
function mapLabelToCategory(label) {
  const normalized = label?.toString().toUpperCase().trim() || "";
  
  // Adjust these based on exactly what your new model outputs
  if (["REAL", "LABEL_1", "1"].includes(normalized)) return "Real";
  if (["FAKE", "LABEL_0", "0"].includes(normalized)) return "Fake";
  
  return "Uncertain";
}

/**
 * AI ENGINE: Communicates with your Local Python Service (FastAPI)
 */
async function queryLocalAi(text) {
  try {
    console.log(`🧠 Sending ${text.length} chars to Local AI...`);
    
    // Send to Python Microservice
    const response = await axios.post(LOCAL_AI_URL, { 
      text: text 
    });

    // Python returns: { label: "REAL", confidence: 99.5, ... }
    return response.data;

  } catch (error) {
    console.error("❌ AI Service Error:", error.message);
    if (error.code === "ECONNREFUSED") {
      throw new Error("AI Brain is offline. Please run the Python server (app.py).");
    }
    throw error;
  }
}

/* ================= EXPORTED FUNCTIONS ================= */

/**
 * Analyzes news from a URL
 */
export async function classifyFromLink(url) {
  try {
    console.log(`🌍 Scraping: ${url}`);
    
    // 1. Scrape (Node.js + Puppeteer)
    const scrapedText = await extractTextFromLink(url);

    // 2. Safety Check (Keep your existing logic)
    const errorPageKeywords = ["404", "page not found", "access denied", "enable cookies", "forbidden"];
    const isError = errorPageKeywords.some(word => scrapedText.toLowerCase().includes(word));

    if (!scrapedText || scrapedText.length < 300 || isError) {
      return { 
        success: false, 
        isBlocked: true, 
        error: "Source Protected: Website blocked the scan." 
      };
    }

    // 3. Predict (Local Python Model)
    const prediction = await queryLocalAi(scrapedText);

    return {
      success: true,
      label: mapLabelToCategory(prediction.label),
      confidence: prediction.confidence,
      snippet: scrapedText.slice(0, 200) + "...", // Snippet for the UI
      title: "Article Analysis" // You can enhance scraper to return title later
    };

  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Analyzes news from a PDF file
 */
export async function classifyFromPdf(path) {
    try {
        console.log(`📄 Analyzing PDF: ${path}`);
        
        // 1. Extract Text
        const text = await exportTextFromPdf(path);
        
        if (!text || text.trim().length < 10) throw new Error("PDF content is empty.");
        
        // 2. Predict (Local Python Model)
        const prediction = await queryLocalAi(text);
        
        return {
            success: true,
            label: mapLabelToCategory(prediction.label),
            confidence: prediction.confidence,
            snippet: text.slice(0, 150) + "..."
        };
    } catch (err) {
        console.error("❌ classifyFromPdf Error:", err.message);
        return { success: false, error: err.message };
    }
}