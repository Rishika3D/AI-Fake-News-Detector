import { InferenceClient } from "@huggingface/inference";
import dotenv from "dotenv";
import { extractTextFromLink } from "./textExtractor.js";
import { exportTextFromPdf } from "./pdfService.js";

dotenv.config();
if (!process.env.HF_TOKEN) {
  console.error("HF_TOKEN environment variable is not set!");
  process.exit(1);
}
const client = new InferenceClient(process.env.HF_TOKEN);

const MODEL_NAME = "mrm8488/bert-tiny-finetuned-fake-news-detection";
const PROVIDER = "hf-inference";

// THE FIX: Lowered from 1000 to 700 to be safely under the 512 token limit
const MAX_INPUT_CHARS = 700;

// --- Private Helper Function ---
async function _performClassification(inputText) {
  if (!inputText || inputText.trim().length === 0) {
    throw new Error("Input text is empty or could not be extracted.");
  }
  const truncatedText = inputText.substring(0, MAX_INPUT_CHARS);

  const result = await client.textClassification({
    model: MODEL_NAME,
    inputs: truncatedText, 
    provider: PROVIDER,
  });

  if (!result || result.length === 0) {
    throw new Error("Received invalid response from classification API.");
  }

  const top = result[0];
  console.log(`Label: ${top.label}, Confidence: ${(top.score * 100).toFixed(2)}%`);
  return { label: top.label, confidence: top.score };
}

export async function classifyFromPdf(filepath) {
  try {
    const text = await exportTextFromPdf(filepath);
    return await _performClassification(text);
  } catch (error) {
    console.error(`Failed to classify PDF (${filepath}):`, error.message);
    return null;
  }
}

export async function classifyFromLink(url) {
  try {
    const text = await extractTextFromLink(url);
    return await _performClassification(text);
  } catch (error) {
    console.error(`Failed to classify link (${url}):`, error.message);
    return null;
  }
}