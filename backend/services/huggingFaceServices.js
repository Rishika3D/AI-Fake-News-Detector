import { Client } from "@gradio/client"; 
import dotenv from "dotenv";
import { extractTextFromLink } from "./textExtractor.js";
import { exportTextFromPdf } from "./pdfService.js";

dotenv.config();

// ✅ YOUR CUSTOM MODEL
const SPACE_ID = "Rishika08/fake-news-detector";

/* ================= HELPERS ================= */

/**
 * MAPPING BASED ON YOUR TEST RESULTS:
 * LABEL_0 = Real
 * LABEL_1 = Fake
 */
function mapLabelToCategory(label) {
  const normalized = label?.toString().toUpperCase() || "";
  
  // Check for Real (LABEL_0)
  if (normalized.includes("LABEL_0") || normalized === "0") {
    return "Real";
  }
  
  // Check for Fake (LABEL_1)
  if (normalized.includes("LABEL_1") || normalized === "1") {
    return "Fake";
  }
  
  return "Uncertain";
}

/**
 * CONNECT TO YOUR SPACE
 */
async function queryMySpace(text) {
  try {
    console.log(`📡 Connecting to your Space: ${SPACE_ID}...`);
    
    // 1. Connect to your custom Space
    const client = await Client.connect(SPACE_ID);

    // 2. Send the text to your app's "/predict" endpoint
    // We truncate to 1500 chars to fit the model's window
    const result = await client.predict("/predict", [ text.slice(0, 1500) ]);

    // 3. Extract Result
    // Gradio returns: { data: [ { label: 'LABEL_0', score: 0.99 } ] }
    const prediction = result.data[0]; 
    return prediction;

  } catch (error) {
    console.error("❌ Space Error:", error.message);
    throw new Error(`Failed to connect to your AI model. Is the Space running? Error: ${error.message}`);
  }
}

/* ================= EXPORTED FUNCTIONS ================= */

export async function classifyFromLink(url) {
  try {
    console.log(`🔎 Scraping URL: ${url}`);
    
    // 🛡️ 1. SAFETY CHECK: Whitelist Trusted Domains
    // If the URL is from a known reliable source, don't waste AI resources (and risk error)
    const trustedDomains = ["bbc.com", "reuters.com", "nytimes.com", "wikipedia.org", "cnn.com"];
    
    // Check if the URL contains any trusted domain
    if (trustedDomains.some(domain => url.includes(domain))) {
        console.log("🔒 Whitelist: Trusted Source Detected");
        // We still scrape to get the snippet for the UI, but we force the label to "Real"
        const text = await extractTextFromLink(url);
        return { 
           success: true, 
           label: "Real", 
           confidence: 1.0, // 100% confidence
           snippet: text ? text.slice(0, 200) + "..." : "Trusted Source Content"
        };
    }

    // 2. SCRAPE & PREDICT (For everything else)
    const text = await extractTextFromLink(url);

    if (!text || text.trim().length < 50) {
      return { success: false, error: "Webpage content was empty or unreadable." };
    }

    console.log(`🧠 Sending to AI model...`);
    const result = await queryMySpace(text);

    return {
      success: true,
      label: mapLabelToCategory(result.label),
      confidence: result.score,
      snippet: text.slice(0, 200) + "..." 
    };

  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function classifyFromPdf(path) {
  try {
    console.log(`📂 Processing PDF: ${path}`);
    const text = await exportTextFromPdf(path);
    
    if (!text || text.length < 50) {
       return { success: false, error: "PDF text too short." };
    }

    const result = await queryMySpace(text);
    
    return {
      success: true,
      label: mapLabelToCategory(result.label),
      confidence: result.score,
      snippet: text.slice(0, 200) + "..."
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}