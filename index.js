import axios from 'axios';
import fs from 'fs';

const FB_PAGE_ID = process.env.FB_PAGE_ID;
const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const CACHE_FILE = ".cache/fb.json";

function getLastPostedId() {
  try {
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    return data.lastId || null;
  } catch {
    return null;
  }
}

function saveLastPostedId(id) {
  const data = { lastId: id };
  fs.mkdirSync(".cache", { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data));
}

// Fetch latest posts from Facebook Page
async function getLatestPost() {
  try {
    const res = await axios.get(`https://graph.facebook.com/v18.0/${FB_PAGE_ID}/posts`, {
      params: {
        access_token: FB_ACCESS_TOKEN,
        fields: 'message,permalink_url,created_time,id,attachments{media}',
        limit: 2
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

async function sendToDiscord(post) {
  const content = `${post.message || ''}\n[*See post*](<${post.permalink_url}>)`;

  const imageUrl = post.attachments?.data?.[0]?.media?.image?.src || '';

  const embeds = [];

  if (imageUrl) {
    embeds.push({
      image: {
        url: imageUrl
      },
      url: post.permalink_url,
      timestamp: post.created_time
    });
  }

  try {
    await axios.post(DISCORD_WEBHOOK_URL, {
      content,
      embeds
    });
  } catch {}
}

async function checkForNewPost() {
  const latest = await getLatestPost();
  if (!latest) return;

  const lastId = getLastPostedId();
  if (latest.id === lastId) return;

  await sendToDiscord(latest);
  saveLastPostedId(latest.id);
}

// Run the check
checkForNewPost();
