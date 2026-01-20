import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import axios from 'axios';
import * as cheerio from 'cheerio';

puppeteer.use(StealthPlugin());

// 🤡 KNOWN SATIRE DOMAINS (Skip AI for these)
const SATIRE_DOMAINS = [
    'theonion.com', 
    'babylonbee.com', 
    'clickhole.com', 
    'duffelblog.com', 
    'waterfordwhispersnews.com',
    'reductress.com'
];

export async function extractTextFromLink(url) {
    // 1. SATIRE CHECK
    if (SATIRE_DOMAINS.some(domain => url.includes(domain))) {
        console.log("🤡 Detected known Satire/Parody site.");
        return "SATIRE_CONTENT_DETECTED"; 
    }

    // 2. WIKIPEDIA CHECK (Fast Path)
    if (url.includes('wikipedia.org')) {
        return await scrapeWithAxios(url);
    }

    // 3. MAIN SCRAPER (Puppeteer)
    try {
        console.log(`🕵️‍♂️ Attempting Smart Scrape (Puppeteer): ${url}`);
        return await scrapeWithPuppeteer(url);
    } catch (error) {
        console.warn(`⚠️ Puppeteer failed (${error.message}). Switching to Plan B...`);
        return await scrapeWithAxios(url);
    }
}

// ==========================================
// PLAN A: PUPPETEER
// ==========================================
async function scrapeWithPuppeteer(url) {
    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Block images to speed up
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font'].includes(req.resourceType())) req.abort();
            else req.continue();
        });

        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
        if (response.status() >= 400) throw new Error(`Status ${response.status()}`);

        const text = await page.evaluate(() => {
            // Remove junk
            const junk = ['nav', 'footer', 'header', 'script', 'style', 'aside', '.ad', '.social-share', '#onetrust-banner-sdk'];
            document.querySelectorAll(junk.join(',')).forEach(el => el.remove());

            // Get content from likely article containers
            let root = document.querySelector('article') || document.querySelector('main') || document.body;
            let paragraphs = Array.from(root.querySelectorAll('p'));

            // Filter: Must be >40 chars to count as a real sentence
            return paragraphs
                .map(p => p.innerText.trim())
                .filter(t => t.length > 40)
                .join('\n\n');
        });

        const cleanText = text.trim();
        if (cleanText.length < 200) throw new Error("Scraped text too short.");

        return cleanText;

    } catch (err) {
        throw err; 
    } finally {
        if (browser) await browser.close();
    }
}

// ==========================================
// PLAN B: AXIOS (Backup)
// ==========================================
async function scrapeWithAxios(url) {
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            timeout: 10000
        });

        const $ = cheerio.load(data);
        $('script, style, nav, footer, header, aside, .ad').remove();

        let $content = $('article');
        if ($content.length === 0) $content = $('main');
        if ($content.length === 0) $content = $('body');

        let textParts = [];
        $content.find('p').each((i, el) => {
            const t = $(el).text().replace(/\s+/g, ' ').trim();
            if (t.length > 40) textParts.push(t);
        });

        const cleanText = textParts.join('\n\n');
        if (cleanText.length < 200) throw new Error("Axios text too short.");

        console.log(`✅ Plan B Successful! Scraped ${cleanText.length} chars.`);
        return cleanText;

    } catch (err) {
        throw new Error("Could not extract meaningful text.");
    }
}