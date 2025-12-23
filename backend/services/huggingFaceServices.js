import { Client } from "@gradio/client"; 
import dotenv from "dotenv";
import { extractTextFromLink } from "./textExtractor.js";
import { exportTextFromPdf } from "./pdfService.js";

dotenv.config();

const SPACE_ID = "Rishika08/fake-news-detector-v2"; 

/**
 * MAPPING: Converts model output labels to user-friendly categories.
 */
function mapLabelToCategory(label) {
  // Convert to string and uppercase to handle "Real", "REAL", or "LABEL_1"
  const normalized = label?.toString().toUpperCase().trim() || "";

  if (normalized === "REAL" || normalized === "LABEL_1" || normalized === "1") {
    return "Real";
  }
  if (normalized === "FAKE" || normalized === "LABEL_0" || normalized === "0") {
    return "Fake";
  }

  return "Uncertain";
}

/**
 * AI ENGINE: Communicates with your Hugging Face Space.
 */
async function queryMySpace(text) {
  try {
    console.log(`📡 Connecting to: ${SPACE_ID}`);
    const client = await Client.connect(SPACE_ID);

    // Clean text: Limit length and remove newlines for API stability
    const titleSnippet = text.slice(0, 500).replace(/\n/g, " ").trim();

    // Call the named endpoint "/predict"
    const result = await client.predict("/predict", { 
        text: titleSnippet 
    });

    if (result && result.data) {
        console.log("✅ Success! Model returned:", result.data[0]);
        return result.data[0]; 
    }
    throw new Error("AI returned success but no data was found.");

  } catch (error) {
    console.error("❌ API Error:", error.message);
    throw error;
  }
}

/* ================= EXPORTED FUNCTIONS ================= */

/**
 * Analyzes news from a URL and prepares data for the Database
 */
export async function classifyFromLink(url) {
  try {
    const scrapedText = await extractTextFromLink(url);

    // 🛑 NEW: Safety Check for Bot Blocks or 404s
    const errorPageKeywords = ["404", "page not found", "access denied", "enable cookies", "forbidden"];
    const isError = errorPageKeywords.some(word => scrapedText.toLowerCase().includes(word));

    if (!scrapedText || scrapedText.length < 300 || isError) {
      return { 
        success: false, 
        isBlocked: true, // Tag this so the frontend knows how to style it
        error: "Source Protected: This website blocked our automated scan. The AI cannot verify the content safely." 
      };
    }

    // ... (rest of your existing AI/HuggingFace logic)
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
        const text = await exportTextFromPdf(path);
        
        if (!text || text.trim().length < 10) throw new Error("PDF content is empty.");
        
        const prediction = await queryMySpace(text);
        
        return {
            success: true,
            label: mapLabelToCategory(prediction.label),
            confidence: parseFloat((prediction.score * 100).toFixed(2)),
            snippet: text.slice(0, 150) + "..."
        };
    } catch (err) {
        console.error("❌ classifyFromPdf Error:", err.message);
        return { success: false, error: err.message };
    }
}