import { promises as fs } from "fs";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

export const exportTextFromPdf = async (filepath) => {
  try {
    const dataBuffer = await fs.readFile(filepath);
    const dataUint8Array = new Uint8Array(dataBuffer);

    // Load the PDF document
    const pdf = await pdfjsLib.getDocument({
      data: dataUint8Array,
      useWorkerFetch: false,
      disableFontFace: true,
      standardFontDataUrl: "node_modules/pdfjs-dist/standard_fonts/",
    }).promise;

    let allText = "";

    // Limit to 10 pages to prevent AI token overflow/timeouts
    const pageCount = Math.min(pdf.numPages, 10);
    
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map(item => item.str)
        // 1. FILTER NOISE: Remove page numbers, headers, and tiny fragments (< 5 chars)
        .filter(str => str.trim().length > 5) 
        .join(" ") 
        // 2. CLEANUP: Squash multiple spaces/tabs into one single space
        .replace(/\s+/g, ' '); 

      allText += pageText + "\n"; 
    }

    // 3. QUALITY GATE: Ensure we actually got enough text for the AI
    if (allText.trim().length < 50) {
      throw new Error("PDF content is too short or unreadable (scanned image?).");
    }

    return allText.trim();
  } catch (err) {
    console.error("❌ PDF Extraction Error:", err.message);
    throw new Error("Failed to extract text from PDF. Ensure it is a text-based PDF, not an image.");
  }
};