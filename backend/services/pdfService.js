import { promises as fs } from "fs";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

export const exportTextFromPdf = async (filepath) => {
  try {
    const dataBuffer = await fs.readFile(filepath);
    const dataUint8Array = new Uint8Array(dataBuffer);

    // 3. Load the PDF document
    const pdf = await pdfjsLib.getDocument({
      data: dataUint8Array, // Use the new Uint8Array here
      useWorkerFetch: false,
      disableFontFace: true,
      standardFontDataUrl: "pdfjs-dist/standard_fonts/",
    }).promise;

    let allText = "";

    // 4. Loop through each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(" ");
      allText += pageText + "\n"; 
    }

    if (!allText) {
      throw new Error("No text found in PDF.");
    }

    return allText;
  } catch (err) {
    console.error("Error parsing PDF:", err.message);
    throw new Error("Failed to extract text from PDF.");
  }
};