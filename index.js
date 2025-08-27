require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const xml2js = require('xml2js');

const app = express();
const PORT = process.env.PORT || 4000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

app.use(cors());
app.use(express.json());

/**
 * GitHub GraphQL API endpoint
 * GET /api/github/:username
 */
app.get('/api/github/:username', async (req, res) => {
  const username = req.params.username;

  const query = `
  {
    user(login:"${username}") { 
      name
      bio
      avatarUrl
      location
      pinnedItems(first: 6, types: [REPOSITORY]) {
        edges {
          node {
            ... on Repository {
              name
              description
              forkCount
              stargazers { totalCount }
              url
              id
              diskUsage
              primaryLanguage { name color }
            }
          }
        }
      }
    }
  }
  `;

  try {
    const response = await axios.post(
      'https://api.github.com/graphql',
      { query },
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          'User-Agent': 'Node.js'
        }
      }
    );
    res.json(response.data);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'GitHub fetch failed' });
  }
});

/**
 * Medium RSS feed endpoint
 * GET /api/medium/:username
 */
app.get('/api/medium/:username', async (req, res) => {
  const username = req.params.username;
  const url = `https://medium.com/feed/@${username}`;

  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    xml2js.parseString(response.data, (err, result) => {
      if (err) return res.status(500).json({ error: 'Failed to parse Medium RSS' });

      const channel = result.rss.channel[0];
      const feed = {
        url,
        title: channel.title[0],
        link: channel.link[0],
        author: channel["dc:creator"] ? channel["dc:creator"][0] : "",
        description: channel.description[0],
        image: channel["image"] ? channel["image"][0].url[0] : "",
      };

      const items = channel.item.map(it => ({
        title: it.title[0],
        pubDate: it.pubDate[0],
        link: it.link[0],
        guid: it.guid[0]._ || it.guid[0],
        author: it["dc:creator"] ? it["dc:creator"][0] : feed.author,
        thumbnail: "",
        description: it.description ? it.description[0] : "",
        content: it["content:encoded"] ? it["content:encoded"][0] : "",
        enclosure: {},
        categories: it.category || [],
      }));

      res.json({ status: "ok", feed, items });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Medium fetch failed' });
  }
});

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
