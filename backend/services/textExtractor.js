import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Use the stealth plugin to bypass simple bot detection
puppeteer.use(StealthPlugin());

export async function extractTextFromLink(url) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled', 
        '--window-size=1920,1080'
      ] 
    });

    const page = await browser.newPage();
    
    // 1. Set User-Agent to look like a real Chrome browser on Windows
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

    // 2. Add Headers to mimic a referral from Google
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.google.com/' 
    });

    // 3. Load the page (wait for network to be idle)
    const response = await page.goto(url, { 
      waitUntil: 'networkidle2', 
      timeout: 45000 // Extended timeout for heavy news sites
    });

    // 4. Check for Bot Blocks immediately
    const pageTitle = await page.title();
    if (response.status() === 403 || response.status() === 404 || pageTitle.toLowerCase().includes("access denied")) {
        throw new Error(`Target site blocked the scraper (Status: ${response.status()})`);
    }

    // 5. Human Behavior Simulation (Scroll to trigger lazy loading)
    await page.evaluate(async () => {
        await new Promise(resolve => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if(totalHeight >= scrollHeight || totalHeight > 2000){ // Don't scroll forever
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });

    // 6. Intelligent Extraction Logic
    const cleanText = await page.evaluate(() => {
        // Remove "Junk" elements that confuse AI
        const junkSelectors = [
            'nav', 'footer', 'header', 'script', 'style', 'aside', 'iframe', 
            '.ads', '.ad-container', '#cookie-banner', '.menu', '.sidebar'
        ];
        junkSelectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => el.remove());
        });

        // Strategy A: Look for common article containers
        const articleSelectors = ['article', '[role="main"]', '.article-body', '.story-content'];
        let mainContent = null;
        
        for (let sel of articleSelectors) {
            const el = document.querySelector(sel);
            if (el && el.innerText.length > 500) {
                mainContent = el;
                break;
            }
        }

        // Strategy B: Fallback to all Paragraphs if no container found
        const source = mainContent || document.body;
        const paragraphs = Array.from(source.querySelectorAll('p'));

        // Filter: Keep only "meaningful" paragraphs (> 40 chars or > 8 words)
        return paragraphs
            .map(p => p.innerText.trim())
            .filter(text => text.length > 40 && text.split(' ').length > 8)
            .join('\n\n');
    });

    // 7. Final Validation
    if (!cleanText || cleanText.length < 200) {
        throw new Error("Insufficient text found. The page might be empty, paywalled, or blocking bots.");
    }

    return cleanText.trim();

  } catch (error) {
    console.error(`❌ Scraper Error [${url}]: ${error.message}`);
    throw error; // Rethrow so the Controller can send a 500 error
  } finally {
    if (browser) await browser.close();
  }
}