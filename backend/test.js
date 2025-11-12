// test.js
import { classifyFromLink } from './services/huggingFaceServices.js';
import { classifyFromPdf } from './services/huggingFaceServices.js';

// --- DEFINE YOUR TEST INPUTS ---

// 1. The path to the PDF you downloaded
const testPdfPath = './test.pdf';

// 2. A URL to a news article
const testUrl = 'https://www.theguardian.com/world';


/**
 * Main function to run our tests
 */
async function runTests() {
  console.log("--- STARTING TESTS ---");

  // --- Test 1: PDF Classification ---
  try {
    console.log(`\n1. Testing PDF: ${testPdfPath}`);
    const pdfResult = await classifyFromPdf(testPdfPath);
    
    // The console.log from the service will appear first
    console.log("-> Test Script Result:", pdfResult);

  } catch (err) {
    console.error("PDF Test FAILED:", err.message);
  }

  // --- Test 2: Link Classification ---
  try {
    console.log(`\n2. Testing Link: ${testUrl}`);
    const linkResult = await classifyFromLink(testUrl);

    // The console.log from the service will appear first
    console.log("-> Test Script Result:", linkResult);

  } catch (err) {
    console.error("Link Test FAILED:", err.message);
  }

  console.log("\n--- TESTS FINISHED ---");
}

// Run the main test function
runTests();