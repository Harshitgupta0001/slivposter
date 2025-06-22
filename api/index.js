import cheerio from 'cheerio';
import axios from 'axios';

export default async function handler(req, res) {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query + ' site:primevideo.com')}`;

  try {
    const { data } = await axios.get(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/90 Safari/537.36',
      },
    });

    const $ = cheerio.load(data);
    const results = [];

    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('primevideo.com/detail')) {
        const match = href.match(/\/url\?q=(https:\/\/www\.primevideo\.com\/detail\/[^&]+)/);
        if (match && match[1]) {
          results.push(decodeURIComponent(match[1]));
        }
      }
    });

    if (results.length === 0) {
      return res.status(404).json({ error: 'No Prime Video link found' });
    }

    res.json({ result: results[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Scraping failed' });
  }
}
