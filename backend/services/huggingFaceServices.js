import { InferenceClient } from "@huggingface/inference";
import dotenv from "dotenv";
import { extractTextFromLink } from "./textExtractor.js";
import { exportTextFromPdf } from "./pdfService.js";

dotenv.config();

// Initialize Client with your Write Token
const client = new InferenceClient(process.env.HF_ACCESS_TOKEN);

// 🚀 YOUR MODEL (99% Accuracy)
const MODEL_NAME = "Rishika08/deberta-v3-welfake-99-acc";

// DeBERTa can handle 512 tokens (approx 1500-2000 chars). 
// Let's use 1500 to give it maximum context without breaking the limit.
const MAX_INPUT_CHARS = 1500; 

/* ===== HELPERS ===== */

// 0 = Fake, 1 = Real (Based on WELFake dataset training)
function mapLabelToCategory(label) {
  const normalized = label.toUpperCase();
  
  // DeBERTa outputs "LABEL_0" (Fake) or "LABEL_1" (Real)
  if (normalized === "LABEL_0" || normalized === "0") return "Fake";
  if (normalized === "LABEL_1" || normalized === "1") return "Real";
  
  return "Uncertain";
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ===== CORE CLASSIFICATION ===== */
async function performClassification(text) {
  // Truncate text to fit model context window
  const truncated = text.slice(0, MAX_INPUT_CHARS);
  
  let attempts = 0;
  const maxAttempts = 5; 

  while (attempts < maxAttempts) {
    try {
      console.log(`🤖 Asking AI (Attempt ${attempts + 1})...`);
      
      const result = await client.textClassification({
        model: MODEL_NAME,
        inputs: truncated,
      });

      // The result is usually an array: [{ label: 'LABEL_0', score: 0.99 }, ...]
      // We want the top result
      const topResult = result[0]; // Hugging Face sorts by highest score automatically
      
      const category = mapLabelToCategory(topResult.label);
      
      return {
        label: category,
        confidence: topResult.score, // e.g. 0.998
        raw: result // Keep raw data just in case
      };

    } catch (err) {
      // 503 Error = Model is "Cold" (Loading). We must wait and retry.
      if (err.message.includes("503") || err.message.includes("loading")) {
        console.log(`⏳ Model is waking up... waiting ${3 * (attempts + 1)}s`);
        attempts++;
        await wait(3000 * attempts); 
      } else {
        throw err; // Real error (Auth failed, etc.)
      }
    }
  }

  throw new Error("Model is taking too long to wake up. Please try again in 1 minute.");
}

/* ===== EXPORTS ===== */

// 1. Classify from URL
export async function classifyFromLink(url) {
  try {
    const text = await extractTextFromLink(url);

    if (!text || text.trim().length === 0) {
      return { success: false, error: "No readable text found on webpage." };
    }

    const result = await performClassification(text);

    return {
      success: true,
      label: result.label,      // "Fake" or "Real"
      confidence: result.confidence,
      snippet: text.slice(0, 150) + "..." 
    };

  } catch (err) {
    return { success: false, error: err.message };
  }
}

// 2. Classify from PDF
export async function classifyFromPdf(path) {
  try {
    const text = await exportTextFromPdf(path);
    
    if (!text || text.length < 50) {
       return { success: false, error: "PDF text too short." };
    }

    const result = await performClassification(text);
    
    return {
      success: true,
      label: result.label,
      confidence: result.confidence
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// 3. Classify Raw Text (for manual input)
export async function classifyText(text) {
  try {
    if (!text || text.length < 20) {
      return { success: false, error: "Text is too short to check." };
    }
    const result = await performClassification(text);
    return { success: true, label: result.label, confidence: result.confidence };
  } catch (err) {
    return { success: false, error: err.message };
  }
}