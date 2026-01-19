import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import axios from 'axios';
import * as cheerio from 'cheerio';

puppeteer.use(StealthPlugin());

export async function extractTextFromLink(url) {
    // 🚀 FAST PATH: If it's Wikipedia, skip Puppeteer (it blocks bots) and use Axios directly.
    if (url.includes('wikipedia.org')) {
        console.log("⚡ Detected Wikipedia: Using Fast Scraper (Axios)...");
        return await scrapeWithAxios(url);
    }

    try {
        console.log(`🕵️‍♂️ Attempting Smart Scrape (Puppeteer): ${url}`);
        return await scrapeWithPuppeteer(url);
    } catch (error) {
        console.warn(`⚠️ Puppeteer failed (${error.message}). Switching to "Plan B" (Axios)...`);
        return await scrapeWithAxios(url);
    }
}

// ==========================================
// PLAN A: PUPPETEER (For complex sites)
// ==========================================
async function scrapeWithPuppeteer(url) {
    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-features=IsolateOrigins,site-per-process']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });

        if (response.status() >= 400) throw new Error(`Status ${response.status()}`);

        const text = await page.evaluate(() => {
            // Cleanup
            document.querySelectorAll('nav, footer, header, script, style, .ad').forEach(el => el.remove());
            // Grab largest text block
            return document.body.innerText;
        });

        const cleanText = text.replace(/\n\s*\n/g, '\n').trim();

        // 🚨 CRITICAL: Throw error if text is short so we switch to Plan B
        if (cleanText.length < 500) {
            throw new Error("Scraped text is too short/empty."); 
        }

        return cleanText;

    } catch (err) {
        throw err; // Pass error up to trigger Axios
    } finally {
        if (browser) await browser.close();
    }
}

// ==========================================
// PLAN B: AXIOS + CHEERIO (Reliable & Fast)
// ==========================================
async function scrapeWithAxios(url) {
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });

        const $ = cheerio.load(data);
        
        // Remove junk
        $('script, style, nav, footer, header, aside').remove();

        // Extract text based on site structure
        let text = "";
        if (url.includes('wikipedia.org')) {
            text = $('#bodyContent').text(); // Specific Wikipedia selector
        } else {
            text = $('p').map((i, el) => $(el).text()).get().join('\n');
        }

        const cleanText = text.replace(/\n\s*\n/g, '\n').trim();
        
        if (cleanText.length < 200) throw new Error("Axios text too short.");

        console.log(`✅ Plan B Successful! Scraped ${cleanText.length} chars.`);
        return cleanText;

    } catch (err) {
        throw new Error(`All methods failed: ${err.message}`);
    }
}