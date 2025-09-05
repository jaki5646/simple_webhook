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
        fields: 'message,permalink_url,created_time,id,attachments{media}',
        limit: 1
      }
    });

    const posts = res.data.data;
    if (posts.length === 0) return null;

    const post = posts[0];
    const imageUrl = post.attachments?.data?.[0]?.media?.image?.src || null;

    return {
      id: post.id,
      message: post.message || '',
      permalink_url: post.permalink_url,
      image_url: imageUrl
    };
  } catch (err) {
    console.error('Error fetching latest post:', err.response?.data || err.message);
    return null;
  }
}

async function sendToDiscord(post) {
  const payload = {
    content: post.message || '',
    embeds: []
  };

  if (post.image_url) {
    payload.embeds.push({
      image: {
        url: post.image_url
      },
      url: post.permalink_url,
      footer: {
        text: 'Click to view the full post'
      }
    });
  } else {
    payload.content += `\n[*See post*](${post.permalink_url})`;
  }

  try {
    await axios.post(DISCORD_WEBHOOK_URL, payload);
  } catch (err) {
    console.error('Error sending to Discord:', err.response?.data || err.message);
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