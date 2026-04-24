const GRAPH = 'https://graph.facebook.com/v19.0';
const { getConfig } = require('./platformConfig');

async function sendMetaMessage(platform, pageId, accessToken, recipientId, text) {
  let url, body;

  if (platform === 'whatsapp') {
    url = `${GRAPH}/${pageId}/messages`;
    body = { messaging_product: 'whatsapp', to: recipientId, type: 'text', text: { body: text } };
  } else if (platform === 'instagram') {
    url = `${GRAPH}/${pageId}/messages`;
    body = { recipient: { id: recipientId }, message: { text } };
  } else {
    // facebook messenger
    url = `${GRAPH}/me/messages?access_token=${accessToken}`;
    body = { recipient: { id: recipientId }, message: { text } };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Meta API error');
  return data;
}

async function getMetaPages(userToken) {
  const res = await fetch(
    `${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userToken}`
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch pages');
  return data.data || [];
}

async function exchangeCodeForToken(code, redirectUri) {
  const params = new URLSearchParams({
    client_id:     await getConfig('META_APP_ID'),
    client_secret: await getConfig('META_APP_SECRET'),
    redirect_uri:  redirectUri,
    code,
  });
  const res = await fetch(`${GRAPH}/oauth/access_token?${params}`);
  return res.json();
}

async function getLongLivedToken(shortToken) {
  const params = new URLSearchParams({
    grant_type:        'fb_exchange_token',
    client_id:         await getConfig('META_APP_ID'),
    client_secret:     await getConfig('META_APP_SECRET'),
    fb_exchange_token: shortToken,
  });
  const res = await fetch(`${GRAPH}/oauth/access_token?${params}`);
  return res.json();
}

async function fetchIgProfile(igUserId, pageAccessToken) {
  const res = await fetch(`${GRAPH}/${igUserId}?fields=name,profile_pic&access_token=${pageAccessToken}`);
  return res.json();
}

module.exports = { sendMetaMessage, getMetaPages, exchangeCodeForToken, getLongLivedToken, fetchIgProfile };
