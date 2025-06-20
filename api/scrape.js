import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

// Timeout helper function
const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default async (req, res) => {
  try {
    const { url } = req.query;
    
    // Validate URL
    if (!url || !/sonyliv\.com/i.test(url)) {
      return res.status(400).json({ 
        error: 'Invalid SonyLIV URL. Example: https://www.sonyliv.com/shows/example' 
      });
    }

    // Fetch with timeout and retries
    let html;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.112 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.google.com/'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        html = await response.text();
        break;
      } catch (fetchError) {
        if (attempt === 3) throw fetchError;
        await timeout(2000); // Wait before retrying
      }
    }

    // Create DOM parser
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Extract metadata
    const getMeta = (name) => {
      const meta = doc.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
      return meta ? meta.content : null;
    };

    const cleanUrl = (url) => url ? url.split('?')[0].replace(/&amp;/g, '&') : null;

    const responseData = {
      title: getMeta('og:title') || doc.title || 'Unknown Title',
      year: (html.match(/"datePublished":"(\d{4})/) || [])[1] || 'N/A',
      landscape: cleanUrl(getMeta('twitter:image')),
      portrait: cleanUrl(getMeta('og:image'))
    };

    // Cache response for 1 hour
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
    res.status(200).json(responseData);

  } catch (error) {
    console.error('Scraping Error:', error);
    res.status(500).json({
      error: 'Failed to process URL',
      details: error.message,
      suggestion: 'Try again in 30 seconds or use a different SonyLIV URL'
    });
  }
};
