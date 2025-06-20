import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

export default async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { url } = req.query;
  
  if (!url || !url.includes('sonyliv.com')) {
    return res.status(400).json({ 
      error: 'Invalid SonyLIV URL. Please provide a valid SonyLIV link.' 
    });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.112 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/'
      },
      timeout: 15000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Extract landscape image
    const landscapeMeta = document.querySelector('meta[name="twitter:image"], meta[property="twitter:image"]');
    let landscapeUrl = landscapeMeta ? landscapeMeta.content : '';
    
    // Clean landscape URL
    if (landscapeUrl) {
      landscapeUrl = landscapeUrl.split('?')[0];
      landscapeUrl = landscapeUrl.replace(/&amp;/g, '&');
    }
    
    // Extract portrait image
    const portraitMeta = document.querySelector('meta[property="og:image"]');
    let portraitUrl = portraitMeta ? portraitMeta.content : '';
    
    // Clean portrait URL
    if (portraitUrl) {
      portraitUrl = portraitUrl.split('?')[0];
      portraitUrl = portraitUrl.replace(/&amp;/g, '&');
    }
    
    // Extract title
    const titleMeta = document.querySelector('meta[property="og:title"]') || 
                      document.querySelector('title');
    const title = titleMeta ? titleMeta.content || titleMeta.textContent : 'Unknown Title';
    
    // Extract year
    let year = 'N/A';
    const yearMatch = html.match(/"datePublished":"(\d{4})/);
    if (yearMatch) year = yearMatch[1];
    
    res.status(200).json({
      success: true,
      title: title.trim(),
      year,
      landscape: landscapeUrl,
      portrait: portraitUrl,
      source_url: url
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to scrape SonyLIV page'
    });
  }
};
