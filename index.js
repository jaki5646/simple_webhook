import axios from "axios";

const FB_PAGE_ID = process.env.FB_PAGE_ID;
const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

let lastPostId = null;
async function getLatestPost() {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${FB_PAGE_ID}/posts`,
      {
        params: {
          access_token: FB_ACCESS_TOKEN,
          fields: "message,permalink_url,created_time,id",
          limit: 1,
        },
      }
    );

    const posts = response.data.data;
    return posts.length > 0 ? posts[0] : null;
  } catch (err) {
    console.error(
      "Error fetching Facebook post:",
      err.response?.data || err.message
    );
    return null;
  }
}

async function sendToDiscord(post) {
  const content = `${post.message || "[No message]"}\n\n[*See post*](<${post.permalink_url}>)`;
  try {
    await axios.post(DISCORD_WEBHOOK_URL, { content });
  } catch (err) {
    console.error(
      "❌ Error sending to Discord:",
      err.response?.data || err.message
    );
  }
}

async function checkForNewPost() {
  const latestPost = await getLatestPost();
  if (latestPost && latestPost.id !== lastPostId) {
    await sendToDiscord(latestPost);
    lastPostId = latestPost.id;
  }
}

// Check every 5 minutes
checkForNewPost();