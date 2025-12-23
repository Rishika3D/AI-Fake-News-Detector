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

    // Loop through pages (Max 10 pages to avoid AI token limits)
    const pageCount = Math.min(pdf.numPages, 10);
    
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(" ");
      allText += pageText + "\n"; 
    }

    if (!allText.trim()) {
      throw new Error("No readable text found in PDF.");
    }

    return allText.trim();
  } catch (err) {
    console.error("❌ PDF Extraction Error:", err.message);
    throw new Error("Failed to extract text from PDF.");
  }
};