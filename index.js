import axios from 'axios';
import fs from 'fs';

const FB_PAGE_ID = process.env.FB_PAGE_ID;
const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const LAST_ID_FILE = './lastPostId.txt';

function getLastPostedId() {
  try {
    return fs.readFileSync(LAST_ID_FILE, 'utf-8').trim();
  } catch {
    return null;
  }
}

function saveLastPostedId(id) {
  fs.writeFileSync(LAST_ID_FILE, id);
}

async function getLatestPost() {
  try {
    const res = await axios.get(`https://graph.facebook.com/v18.0/${FB_PAGE_ID}/posts`, {
      params: {
        access_token: FB_ACCESS_TOKEN,
        fields: 'message,permalink_url,created_time,id',
        limit: 1
      }
    });

    const posts = res.data.data;
    return posts.length > 0 ? posts[0] : null;
  } catch {
    return null;
  }
}

async function sendToDiscord(post) {
  const content = `${post.message}\n[*See post](<${post.permalink_url}>)`;
  try {
    await axios.post(DISCORD_WEBHOOK_URL, { content });
  } catch {
    // Fail silently
  }
}

async function checkForNewPost() {
  const latest = await getLatestPost();
  if (!latest) return;

  const lastId = getLastPostedId();
  if (latest.id === lastId) return;

  await sendToDiscord(latest);
  saveLastPostedId(latest.id);
}

checkForNewPost();
