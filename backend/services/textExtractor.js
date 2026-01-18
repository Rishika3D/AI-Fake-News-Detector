import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

// 1. Activate Stealth Mode (Bypasses Cloudflare & Bot Detection)
puppeteer.use(StealthPlugin());

export async function extractTextFromLink(url) {
  let browser;
  try {
    // 2. Launch Browser with "Human" settings
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled' // Crucial for stealth
      ]
    });

    const page = await browser.newPage();

    // 3. Set a Real User-Agent (Update this periodically)
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 4. Block Images/Fonts/CSS to speed up loading (We only need text)
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    console.log(`🌍 Navigating to: ${url}`);
    
    // 5. Go to page (Wait until network is quiet)
    const response = await page.goto(url, { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });

    // Check for 403/404 errors
    if (response.status() >= 400) {
       throw new Error(`Website blocked us (Status: ${response.status()})`);
    }

    // 6. RAW HTML EXTRACTION
    // We don't extract text inside Puppeteer. We just grab the raw HTML.
    // This is faster and less prone to breaking.
    const html = await page.content();

    // 7. THE MAGIC: Parse with Mozilla Readability
    // This removes ads, navbars, and cookie banners automatically.
    const dom = new JSDOM(html, { url: url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent) {
        throw new Error("Page loaded, but no article content was found (Is it a video site or paywall?)");
    }

    // 8. Clean up whitespace
    const cleanTitle = article.title.trim();
    const cleanText = article.textContent
        .replace(/\n\s*\n/g, "\n\n") // Fix double spacing
        .trim();

    // 9. Validation
    if (cleanText.length < 200) {
        throw new Error("Text too short. Probably a captcha or cookie wall.");
    }

    console.log(`✅ Extracted: "${cleanTitle}" (${cleanText.length} chars)`);

    return `${cleanTitle}\n\n${cleanText}`;

  } catch (error) {
    console.error(`❌ Scraper Failed: ${error.message}`);
    
    // Return a specific error object so the frontend knows what happened
    if (error.message.includes("timeout")) throw new Error("The website took too long to respond.");
    if (error.message.includes("blocked")) throw new Error("Access Denied: The website blocked the scraper.");
    
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}