import puppeteer from 'puppeteer';

export async function extractTextFromLink(url) {
  // 1. Launch a real browser (headless means it runs in background)
  const browser = await puppeteer.launch({
    headless: "new", // "new" is the current standard for headless mode
    args: ['--no-sandbox', '--disable-setuid-sandbox'] // often needed for cloud hosting
  });

  try {
    const page = await browser.newPage();

    // 2. Set a real desktop User-Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 3. Go to the URL and wait for the network to stop (this passes the JS checks)
    // 'networkidle2' waits until there are no more than 2 network connections for at least 500 ms
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // 4. Extract text effectively (simulating a user copying the text)
    // This automatically ignores <script>, <style>, and hidden elements!
    const text = await page.evaluate(() => {
        return document.body.innerText; 
    });

    return text;

  } catch (error) {
    throw new Error(`SCRAPING_FAILED: ${error.message}`);
  } finally {
    // 5. Always close the browser, even if there is an error
    if (browser) await browser.close();
  }
}