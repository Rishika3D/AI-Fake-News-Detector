import axios from "axios";
import { extractTextFromLink } from "./textExtractor.js";
import { exportTextFromPdf } from "./pdfService.js";

// ─── HF Inference API ────────────────────────────────────────────────────────
// Uses the same facebook/bart-large-mnli model but via the free HF hosted API.
// No local Flask server needed — works in any cloud environment.
const HF_API_URL  = "https://api-inference.huggingface.co/models/facebook/bart-large-mnli";
const HF_TOKEN    = process.env.HF_ACCESS_TOKEN;
const CANDIDATE_LABELS = ["real news", "fake news", "satire"];
const LABEL_MAP   = { "real news": "TRUSTED", "fake news": "FAKE", "satire": "SATIRE" };

// Local Flask fallback — used automatically when HF_ACCESS_TOKEN is not set (local dev)
const LOCAL_AI_URL = process.env.LOCAL_AI_URL || "http://localhost:8000/predict_text";

/**
 * 🧹 Normalise confidence to a 0–100 number
 */
function parseConfidence(rawScore) {
  if (!rawScore) return 0;
  let scoreNum = Number(String(rawScore).replace("%", ""));
  if (scoreNum > 0 && scoreNum <= 1) scoreNum *= 100;
  return isNaN(scoreNum) ? 0 : scoreNum;
}

/**
 * 🧠 Query whichever AI backend is available.
 *    - Production: HF Inference API (zero-shot, no GPU needed on our server)
 *    - Local dev:  Flask server on localhost:8000
 */
async function queryAi(text) {
  // ── Production path: HF Inference API ──────────────────────────────────────
  if (HF_TOKEN) {
    try {
      console.log(`🧠 Sending ${text.length} chars to HF Inference API…`);
      const { data } = await axios.post(
        HF_API_URL,
        { inputs: text, parameters: { candidate_labels: CANDIDATE_LABELS } },
        {
          headers: { Authorization: `Bearer ${HF_TOKEN}` },
          timeout: 60000, // HF cold-starts can be slow
        }
      );
      // data = { labels: [...], scores: [...] }  (sorted highest → lowest)
      const topLabel = data.labels?.[0];
      const topScore = data.scores?.[0] ?? 0;
      return {
        label:      LABEL_MAP[topLabel] ?? "UNCERTAIN",
        confidence: (topScore * 100).toFixed(2),
      };
    } catch (err) {
      console.error("❌ HF API Error:", err.message);
      return { label: "UNCERTAIN", confidence: "0.00" };
    }
  }

  // ── Local dev path: Flask server ────────────────────────────────────────────
  try {
    console.log(`🧠 Sending ${text.length} chars to Local AI…`);
    const { data } = await axios.post(LOCAL_AI_URL, { text }, { timeout: 30000 });
    return { label: data.label ?? "UNCERTAIN", confidence: data.confidence ?? "0" };
  } catch (err) {
    console.error("❌ Local AI Error:", err.message);
    return { label: "UNCERTAIN", confidence: "0.00" };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */

export async function classifyFromLink(url) {
  try {
    console.log(`🌍 Scraping: ${url}`);
    let scrapedText = await extractTextFromLink(url);

    // 🚨 Known misinformation domain — skip ML entirely
    if (scrapedText === "FAKE_DOMAIN_DETECTED") {
      return {
        success:    true,
        label:      "FAKE",
        confidence: "100.00",
        snippet:    "This domain is on our known misinformation sources list. Treat content with extreme scepticism.",
      };
    }

    // 🤡 Known satire domain — skip ML entirely
    if (scrapedText === "SATIRE_CONTENT_DETECTED") {
      return {
        success:    true,
        label:      "SATIRE",
        confidence: "100.00",
        snippet:    "This source is a known satire/comedy website. Content is fictional.",
      };
    }

    if (!scrapedText || scrapedText.length < 50) {
      return { success: false, error: "Could not read enough text from website." };
    }

    if (scrapedText.length > 5000) scrapedText = scrapedText.slice(0, 5000);

    const prediction = await queryAi(scrapedText);
    const finalScore = parseConfidence(prediction.confidence);

    const finalResult = {
      success:    true,
      label:      prediction.label,
      confidence: finalScore.toFixed(2),
      snippet:    scrapedText.slice(0, 200).replace(/\n/g, " ") + "…",
    };

    console.log("🚀 BACKEND SENDING:", finalResult);
    return finalResult;

  } catch (err) {
    console.error("🔥 CRITICAL BACKEND ERROR:", err.message);
    return { success: false, error: err.message };
  }
}

export async function classifyFromPdf(filePath) {
  try {
    console.log(`📄 Analyzing PDF: ${filePath}`);
    const text = await exportTextFromPdf(filePath);

    if (!text || text.trim().length < 10) throw new Error("PDF content is empty.");

    const cleanText = text.length > 5000 ? text.slice(0, 5000) : text;
    const prediction = await queryAi(cleanText);
    const finalScore = parseConfidence(prediction.confidence);

    return {
      success:    true,
      label:      prediction.label,
      confidence: finalScore.toFixed(2),
      snippet:    cleanText.slice(0, 150).replace(/\n/g, " ") + "…",
    };
  } catch (err) {
    console.error("❌ classifyFromPdf Error:", err.message);
    return { success: false, error: err.message };
  }
}
