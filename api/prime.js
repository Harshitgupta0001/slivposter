import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export default async function handler(req, res) {
  const { q } = req.query;

  if (!q) return res.status(400).json({ error: "Missing ?q= query" });

  const url = `https://www.primevideo.com/search?phrase=${encodeURIComponent(q)}`;

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  try {
    // Wait for flat-card to show up
    await page.waitForSelector('a[data-testid="flat-card"]', { timeout: 6000 });

    // Get first href
    const link = await page.$eval('a[data-testid="flat-card"]', el => el.href);
    await browser.close();

    return res.status(200).json({ result: link });
  } catch (e) {
    await browser.close();
    return res.status(500).json({ error: "No result found" });
  }
}
