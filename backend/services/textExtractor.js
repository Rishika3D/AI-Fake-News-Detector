import puppeteer from 'puppeteer';

export async function extractTextFromLink(url) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });

  try {
    const page = await browser.newPage();
    
    // Set a real User-Agent to avoid being blocked
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Go to URL
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // SMART EXTRACTION LOGIC
    const text = await page.evaluate(() => {
        // 1. Remove junk elements that confuse the AI
        const junkSelectors = [
            'nav', 'footer', 'header', 'script', 'style', 'noscript', 
            '.ad', '.advertisement', '.cookie-banner', '.subscribe-popup',
            '#sidebar', '.sidebar'
        ];
        junkSelectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => el.remove());
        });

        // 2. Try to find the "Main Article" container
        // These are standard HTML5 tags or common class names for news
        const article = document.querySelector('article') 
                     || document.querySelector('main')
                     || document.querySelector('[role="main"]')
                     || document.querySelector('.post-content')
                     || document.querySelector('.article-body');

        if (article) {
            return article.innerText;
        }

        // 3. Fallback: If no article tag found, grab all paragraphs
        // This avoids menus because menus are usually lists (<ul>), not paragraphs (<p>)
        const paragraphs = Array.from(document.querySelectorAll('p'));
        // Filter out short "junk" paragraphs (like "Copyright 2024")
        const goodParagraphs = paragraphs
            .map(p => p.innerText)
            .filter(text => text.length > 50); 

        return goodParagraphs.join('\n\n'); 
    });

    // Clean up whitespace (tabs, double spaces)
    const cleanText = text.replace(/\s+/g, ' ').trim();

    // Verification: If text is too short, scraping probably failed (paywall or error)
    if (cleanText.length < 200) {
        console.warn("⚠️ Warning: Scraped text is very short. Might be a paywall.");
    }

    return cleanText;

  } catch (error) {
    throw new Error(`SCRAPING_FAILED: ${error.message}`);
  } finally {
    if (browser) await browser.close();
  }
}