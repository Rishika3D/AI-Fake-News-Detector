import dotenv from "dotenv";
import { Client } from "@gradio/client"; // 👈 Import the official client
import { extractTextFromLink } from "./textExtractor.js";
import { exportTextFromPdf } from "./pdfService.js";

dotenv.config();

/* ================= HELPERS ================= */

/**
 * Maps the AI's raw label to a human-readable category.
 * BASED ON YOUR TESTING:
 * LABEL_0 = Real
 * LABEL_1 = Fake
 */
function mapLabelToCategory(label) {
  const normalized = label?.toString().toUpperCase() || "";
  
  if (normalized.includes("LABEL_0") || normalized === "0") {
    return "Real";
  }
  
  if (normalized.includes("LABEL_1") || normalized === "1") {
    return "Fake";
  }
  
  return "Uncertain";
}

/**
 * CONNECT AND PREDICT USING THE OFFICIAL CLIENT
 * This handles "Waking up", "Queueing", and "API Versions" automatically.
 */
async function querySpace(text) {
  try {
    console.log("📡 Connecting to Hugging Face Space...");
    
    // 1. Connect to your Space
    // The client will automatically handle the URL and connection logic
    const client = await Client.connect("Rishika08/fake-news-detector");

    // 2. Send the data
    // We send the text to the "/predict" endpoint defined in your app.py
    const result = await client.predict("/predict", { 
      text: text.slice(0, 1500) // Truncate to be safe
    });

    // 3. Extract the result
    // The client returns an object like: { data: [ { label: 'LABEL_1', score: 0.99 } ] }
    const prediction = result.data[0];
    return prediction;

  } catch (error) {
    console.error("❌ AI Service Error:", error.message);
    throw new Error(`AI Model Error: ${error.message}`);
  }
}

/* ================= EXPORTED FUNCTIONS ================= */

// 1. Analyze a URL
export async function classifyFromLink(url) {
  try {
    console.log(`📄 Extracting text from: ${url}`);
    const text = await extractTextFromLink(url);

    if (!text || text.trim().length < 50) {
      return { 
        success: false, 
        error: "Webpage content was empty or unreadable (too short)." 
      };
    }

    const result = await querySpace(text);

    return {
      success: true,
      label: mapLabelToCategory(result.label),
      confidence: result.score,
      snippet: text.slice(0, 150) + "..." 
    };

  } catch (err) {
    return { 
      success: false, 
      error: `Analysis failed: ${err.message}` 
    };
  }
}

// 2. Analyze Raw Text
export async function classifyText(text) {
  try {
    if (!text || text.trim().length < 20) {
      return { success: false, error: "Text is too short to analyze." };
    }

    const result = await querySpace(text);

    return {
      success: true,
      label: mapLabelToCategory(result.label),
      confidence: result.score
    };

  } catch (err) {
    return { success: false, error: err.message };
  }
}

// 3. Analyze PDF
export async function classifyFromPdf(path) {
  try {
    console.log(`📂 Processing PDF at: ${path}`);
    const text = await exportTextFromPdf(path);
    
    if (!text || text.length < 50) {
       return { success: false, error: "PDF text could not be extracted or is too short." };
    }

    const result = await querySpace(text);
    
    return {
      success: true,
      label: mapLabelToCategory(result.label),
      confidence: result.score
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}