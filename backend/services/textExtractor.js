import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Use the stealth plugin to hide the "automated" flag
puppeteer.use(StealthPlugin());

export async function extractTextFromLink(url) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled', // Hides "navigator.webdriver"
        '--window-size=1920,1080'
      ] 
    });

    const page = await browser.newPage();
    
    // 1. Set a realistic Desktop User-Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

    // 2. Set realistic headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.google.com/' // Pretend we came from Google search
    });

    // 3. Navigate with 'networkidle2' (wait for most scripts to finish)
    const response = await page.goto(url, { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });

    // 4. Human-like Delay & Scroll
    // This triggers the site's dynamic content loading and "proves" we aren't a fast bot
    await new Promise(r => setTimeout(r, 2000)); 
    await page.evaluate(() => window.scrollBy(0, 400));
    await new Promise(r => setTimeout(r, 1000));

    // 5. Verification: Did we actually get the content?
    const status = response.status();
    const pageTitle = await page.title();
    
    if (status === 404 || pageTitle.toLowerCase().includes("not found")) {
        throw new Error("Site returned 404 (Ghosted). Bot protection is likely blocking this IP.");
    }

    // 6. Extraction Logic
    const cleanText = await page.evaluate(() => {
        // Remove junk elements first
        ['nav', 'footer', 'header', 'script', 'style', 'aside', 'iframe'].forEach(tag => {
            document.querySelectorAll(tag).forEach(el => el.remove());
        });

        // Try to find the main article container
        const selectors = ['article', 'main', '.article-content', '.story-body'];
        for (let sel of selectors) {
            const el = document.querySelector(sel);
            if (el && el.innerText.length > 300) return el.innerText;
        }

        // Fallback: Just grab paragraphs
        return Array.from(document.querySelectorAll('p'))
                    .map(p => p.innerText.trim())
                    .filter(txt => txt.length > 30)
                    .join(' ');
    });

    return cleanText.trim();

  } catch (error) {
    console.error(`❌ Scraper Detail: ${error.message}`);
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}