const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 86400 }); // Cache for 24 hours

router.get('/cyware-news', async (req, res) => {
    try {
        // Check cache first
        const cachedNews = cache.get('cywareNews');
        if (cachedNews) {
            return res.json(cachedNews);
        }

        // Fetch news if not in cache
        const { data } = await axios.get('https://social.cyware.com/cyber-security-news-articles');
        const $ = cheerio.load(data);
        const headlines = [];
        
        $('h1').each((i, el) => {
            const headline = $(el).text().trim();
            if (headline) {
                headlines.push(headline);
            }
        });

        // Cache the results
        cache.set('cywareNews', { headlines });
        res.json({ headlines });
    } catch (error) {
        console.error('Error fetching news:', error);
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});

module.exports = router;
