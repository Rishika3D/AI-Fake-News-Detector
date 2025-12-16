import { InferenceClient } from "@huggingface/inference";
import dotenv from "dotenv";
import { extractTextFromLink } from "./textExtractor.js";
import { exportTextFromPdf } from "./pdfService.js";

dotenv.config();

const client = new InferenceClient(process.env.HF_TOKEN);

const MODEL_NAME = "mrm8488/bert-tiny-finetuned-fake-news-detection";
const PROVIDER = "hf-inference";
const MAX_INPUT_CHARS = 700;

/* ===== PRIVATE ===== */
async function performClassification(text) {
  const truncated = text.slice(0, MAX_INPUT_CHARS);

  const result = await client.textClassification({
    model: MODEL_NAME,
    inputs: truncated,
    provider: PROVIDER
  });

  return {
    label: result[0].label,
    confidence: result[0].score
  };
}

/* ===== LINK ===== */
export async function classifyFromLink(url) {
  try {
    const text = await extractTextFromLink(url);

    if (!text || text.trim().length === 0) {
      return {
        success: false,
        reason: "EMPTY_CONTENT",
        error: "No readable text found on webpage."
      };
    }

    const result = await performClassification(text);

    return {
      success: true,
      label: result.label,
      confidence: result.confidence
    };

  } catch (err) {
    const msg = err.message.toLowerCase();

    if (msg.includes("403") || msg.includes("blocked")) {
      return {
        success: false,
        reason: "BLOCKED_BY_WEBSITE",
        error: "This website blocks automated access."
      };
    }

    return {
      success: false,
      reason: "FETCH_FAILED",
      error: err.message
    };
  }
}

/* ===== PDF ===== */
export async function classifyFromPdf(path) {
  try {
    const text = await exportTextFromPdf(path);
    return await performClassification(text);
  } catch {
    return null;
  }
}
