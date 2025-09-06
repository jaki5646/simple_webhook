import axios from 'axios';
import fs from 'fs';

const FB_PAGE_ID = process.env.FB_PAGE_ID;
const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const CACHE_FILE = '.cache/fb.json';

// Load last post ID
function getLastPostId() {
  try {
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    return data.lastId || null;
  } catch {
    return null;
  }
}

// Save last post ID
function saveLastPostId(id) {
  fs.mkdirSync('.cache', { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify({ lastId: id }), 'utf-8');
}

// Fetch latest post
async function getLatestPost() {
  try {
    const res = await axios.get(`https://graph.facebook.com/v18.0/${FB_PAGE_ID}/posts`, {
      params: {
        access_token: FB_ACCESS_TOKEN,
        fields: 'message,permalink_url,created_time,id,attachments{media}',
        limit: 2,
      }
    });

    const posts = res.data.data;
    if (!posts || posts.length === 0) return null;

    posts.sort((a, b) => new Date(b.created_time) - new Date(a.created_time));
    return posts[0];
  } catch {
    return null;
  }
}

// Send to Discord
async function sendToDiscord(post) {
  const content = `${post.message || ''}\n[*See post*](<${post.permalink_url}>)`;
  const image = post.attachments?.data?.[0]?.media?.image?.src;

  const embeds = image
    ? [{ image: { url: image }, url: post.permalink_url, timestamp: post.created_time }]
    : [];

  try {
    await axios.post(DISCORD_WEBHOOK_URL, { content, embeds });
  } catch {
    // Silent fail
  }
}

// Main logic
async function run() {
  const latest = await getLatestPost();
  if (!latest) return;

  const lastId = getLastPostId();
  if (latest.id === lastId) return;

  await sendToDiscord(latest);
  saveLastPostId(latest.id);
}

run();
