const express = require('express');
const requireAuth = require('../middleware/auth');
const SocialAccount = require('../models/SocialAccount');
const Conversation  = require('../models/Conversation');
const Message       = require('../models/Message');
const { sendMetaMessage, getMetaPages, exchangeCodeForToken, getLongLivedToken, fetchIgProfile } = require('../utils/metaApi');
const { getConfig, invalidateCache } = require('../utils/platformConfig');
const PlatformConfig = require('../models/PlatformConfig');
const { getIo } = require('../socket');

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

async function upsertConversation(account, externalId, profile = {}) {
  const conv = await Conversation.findOneAndUpdate(
    { account: account._id, externalId },
    {
      $setOnInsert: {
        outlet:         account.outlet,
        platform:       account.platform,
        customerName:   profile.name   || externalId,
        customerHandle: profile.handle || null,
        customerAvatar: profile.avatar || null,
      },
    },
    { upsert: true, new: true }
  );
  return conv;
}

function emitToOutlet(outletId, event, payload) {
  const io = getIo();
  if (io) io.to(`outlet:${outletId}`).emit(event, payload);
}

// ── Accounts ──────────────────────────────────────────────────────────────────

router.get('/accounts', requireAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.outlet) filter.outlet = req.query.outlet;
    const accounts = await SocialAccount.find(filter).populate('outlet', 'name city').sort({ platform: 1, createdAt: 1 });
    res.json({ success: true, accounts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/accounts', requireAuth, async (req, res) => {
  try {
    const { outlet, platform, label, pageId, accessToken, metadata } = req.body;
    if (!outlet || !platform || !label || !pageId || !accessToken)
      return res.status(400).json({ success: false, message: 'outlet, platform, label, pageId and accessToken are required' });

    const account = await SocialAccount.findOneAndUpdate(
      { platform, pageId },
      { outlet, platform, label, pageId, accessToken, metadata: metadata || {}, isActive: true },
      { upsert: true, new: true }
    ).populate('outlet', 'name city');

    res.json({ success: true, account });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/accounts/:id', requireAuth, async (req, res) => {
  try {
    const account = await SocialAccount.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('outlet', 'name city');
    res.json({ success: true, account });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/accounts/:id', requireAuth, async (req, res) => {
  try {
    await SocialAccount.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Meta OAuth ────────────────────────────────────────────────────────────────

// ── Platform Config (API credentials) ────────────────────────────────────────

const CONFIG_KEYS = [
  { key: 'SERVER_URL',                label: 'Server URL',                platform: 'general', secret: false },
  { key: 'META_APP_ID',               label: 'Meta App ID',               platform: 'meta',    secret: false },
  { key: 'META_APP_SECRET',           label: 'Meta App Secret',           platform: 'meta',    secret: true  },
  { key: 'META_WEBHOOK_VERIFY_TOKEN', label: 'Webhook Verify Token',      platform: 'meta',    secret: true  },
  { key: 'TIKTOK_CLIENT_KEY',         label: 'TikTok Client Key',         platform: 'tiktok',  secret: false },
  { key: 'TIKTOK_CLIENT_SECRET',      label: 'TikTok Client Secret',      platform: 'tiktok',  secret: true  },
];

router.get('/config', requireAuth, async (req, res) => {
  try {
    const rows = await PlatformConfig.find({ key: { $in: CONFIG_KEYS.map(c => c.key) } }).lean();
    const dbMap = {};
    rows.forEach(r => { dbMap[r.key] = r.value; });

    const config = CONFIG_KEYS.map(meta => {
      const raw  = dbMap[meta.key] || process.env[meta.key] || '';
      const source = dbMap[meta.key] ? 'db' : (process.env[meta.key] ? 'env' : 'unset');
      const masked = raw
        ? (meta.secret ? `${'•'.repeat(Math.max(0, raw.length - 4))}${raw.slice(-4)}` : raw)
        : '';
      return { ...meta, value: masked, isSet: !!raw, source };
    });

    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Returns the real (unmasked) META_APP_ID so the frontend FB SDK can init
router.get('/config/app-id', requireAuth, async (req, res) => {
  try {
    const appId = await getConfig('META_APP_ID');
    res.json({ success: true, appId: appId || '' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/config', requireAuth, async (req, res) => {
  try {
    const { updates } = req.body; // [{ key, value }]
    if (!Array.isArray(updates)) return res.status(400).json({ success: false, message: 'updates must be an array' });

    const validKeys = CONFIG_KEYS.map(c => c.key);
    for (const { key, value } of updates) {
      if (!validKeys.includes(key)) continue;
      if (value === '' || value == null) {
        await PlatformConfig.deleteOne({ key });
      } else {
        await PlatformConfig.findOneAndUpdate({ key }, { key, value: value.trim() }, { upsert: true });
      }
    }
    invalidateCache();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Meta OAuth ────────────────────────────────────────────────────────────────

// ── Token-based connect (from FB JS SDK popup) ────────────────────────────────

router.post('/connect/token', requireAuth, async (req, res) => {
  try {
    const { outlet, accessToken } = req.body;
    if (!outlet || !accessToken)
      return res.status(400).json({ success: false, message: 'outlet and accessToken required' });

    const longToken = await getLongLivedToken(accessToken);
    if (longToken.error)
      return res.status(400).json({ success: false, message: longToken.error.message });

    const pages     = await getMetaPages(longToken.access_token);
    const connected = [];

    for (const page of pages) {
      const fb = await SocialAccount.findOneAndUpdate(
        { platform: 'facebook', pageId: page.id },
        { outlet, platform: 'facebook', label: page.name, pageId: page.id, accessToken: page.access_token, isActive: true },
        { upsert: true, new: true }
      ).populate('outlet', 'name city');
      connected.push({ platform: 'facebook', label: page.name, id: page.id });

      if (page.instagram_business_account) {
        const igId = page.instagram_business_account.id;
        const ig   = await SocialAccount.findOneAndUpdate(
          { platform: 'instagram', pageId: igId },
          { outlet, platform: 'instagram', label: `${page.name} (Instagram)`, pageId: igId, accessToken: page.access_token, isActive: true },
          { upsert: true, new: true }
        );
        connected.push({ platform: 'instagram', label: `${page.name} (Instagram)`, id: igId });
      }
    }

    res.json({ success: true, connected, total: connected.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/connect/facebook', requireAuth, async (req, res) => {
  const { outlet } = req.query;
  const appId = await getConfig('META_APP_ID');
  if (!appId)
    return res.status(400).json({ success: false, message: 'META_APP_ID not configured — add it in Connections → API Configuration' });

  const serverUrl = await getConfig('SERVER_URL') || process.env.SERVER_URL || 'http://localhost:5000';
  const state    = Buffer.from(JSON.stringify({ outlet })).toString('base64');
  const callback = `${serverUrl}/api/social/connect/callback`;
  const scope    = [
    'pages_show_list', 'pages_manage_metadata', 'pages_messaging',
    'instagram_manage_messages',
    'whatsapp_business_messaging', 'whatsapp_business_management',
  ].join(',');

  const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(callback)}&scope=${scope}&state=${state}&response_type=code`;
  res.redirect(url);
});

router.get('/connect/callback', async (req, res) => {
  const redirect = (status, msg) => res.redirect(`/connections?${status}=${encodeURIComponent(msg)}`);
  try {
    const { code, state, error } = req.query;
    if (error) return redirect('error', error);

    const { outlet } = JSON.parse(Buffer.from(state, 'base64').toString());
    const serverUrl  = await getConfig('SERVER_URL') || process.env.SERVER_URL || 'http://localhost:5000';
    const callback   = `${serverUrl}/api/social/connect/callback`;

    const shortToken = await exchangeCodeForToken(code, callback);
    if (shortToken.error) return redirect('error', shortToken.error.message);

    const longToken = await getLongLivedToken(shortToken.access_token);
    const pages     = await getMetaPages(longToken.access_token);

    for (const page of pages) {
      await SocialAccount.findOneAndUpdate(
        { platform: 'facebook', pageId: page.id },
        { outlet, platform: 'facebook', label: page.name, pageId: page.id, accessToken: page.access_token, isActive: true },
        { upsert: true }
      );

      if (page.instagram_business_account) {
        const igId = page.instagram_business_account.id;
        await SocialAccount.findOneAndUpdate(
          { platform: 'instagram', pageId: igId },
          { outlet, platform: 'instagram', label: `${page.name} IG`, pageId: igId, accessToken: page.access_token, isActive: true },
          { upsert: true }
        );
      }
    }

    redirect('connected', `${pages.length} page(s) connected`);
  } catch (err) {
    redirect('error', err.message);
  }
});

// ── Meta Webhook ──────────────────────────────────────────────────────────────

router.get('/webhook/meta', async (req, res) => {
  const verifyToken = await getConfig('META_WEBHOOK_VERIFY_TOKEN');
  if (
    req.query['hub.mode'] === 'subscribe' &&
    verifyToken &&
    req.query['hub.verify_token'] === verifyToken
  ) {
    return res.status(200).send(req.query['hub.challenge']);
  }
  res.sendStatus(403);
});

router.post('/webhook/meta', (req, res) => {
  res.sendStatus(200);
  processMetaWebhook(req.body).catch(err => console.error('Webhook err:', err.message));
});

async function processMetaWebhook(body) {
  if (!body?.entry) return;

  for (const entry of body.entry) {
    if (body.object === 'whatsapp_business_account') {
      for (const change of (entry.changes || [])) {
        await handleWhatsApp(change.value);
      }
    } else if (body.object === 'instagram') {
      await handleInstagram(entry);
    } else if (body.object === 'page') {
      await handleFacebook(entry);
    }
  }
}

async function handleWhatsApp(val) {
  if (!val?.messages?.length) return;
  const account = await SocialAccount.findOne({ platform: 'whatsapp', pageId: val.metadata?.phone_number_id });
  if (!account) return;

  for (const msg of val.messages) {
    const contact = val.contacts?.find(c => c.wa_id === msg.from);
    const conv    = await upsertConversation(account, msg.from, {
      name:   contact?.profile?.name || msg.from,
      handle: `+${msg.from}`,
    });

    const body = msg.type === 'text'     ? msg.text?.body
               : msg.type === 'image'    ? '📷 Image'
               : msg.type === 'audio'    ? '🎤 Voice message'
               : msg.type === 'video'    ? '🎥 Video'
               : msg.type === 'document' ? '📄 Document'
               : msg.type === 'location' ? '📍 Location'
               : `[${msg.type}]`;

    const message = await Message.create({
      conversation: conv._id,
      direction:    'inbound',
      body,
      externalId:   msg.id,
      sentAt:       new Date(parseInt(msg.timestamp) * 1000),
    });

    await Conversation.findByIdAndUpdate(conv._id, {
      lastMessage:   body,
      lastMessageAt: message.sentAt,
      $inc:          { unreadCount: 1 },
      ...(conv.status === 'resolved' ? { status: 'open' } : {}),
    });

    emitToOutlet(account.outlet.toString(), 'new_message', { conversationId: conv._id, message });
  }
}

async function handleInstagram(entry) {
  const account = await SocialAccount.findOne({ platform: 'instagram', pageId: entry.id });
  if (!account) return;

  for (const ev of (entry.messaging || [])) {
    if (!ev.message || ev.sender.id === entry.id) continue;

    let name = ev.sender.id;
    try {
      const profile = await fetchIgProfile(ev.sender.id, account.accessToken);
      name = profile.name || name;
    } catch (_) {}

    const conv    = await upsertConversation(account, ev.sender.id, { name });
    const body    = ev.message.text || (ev.message.attachments?.length ? '📎 Attachment' : '');
    const message = await Message.create({
      conversation: conv._id,
      direction:    'inbound',
      body,
      externalId:   ev.message.mid,
      sentAt:       new Date(ev.timestamp),
    });

    await Conversation.findByIdAndUpdate(conv._id, {
      lastMessage: body, lastMessageAt: message.sentAt, $inc: { unreadCount: 1 },
      ...(conv.status === 'resolved' ? { status: 'open' } : {}),
    });

    emitToOutlet(account.outlet.toString(), 'new_message', { conversationId: conv._id, message });
  }
}

async function handleFacebook(entry) {
  const account = await SocialAccount.findOne({ platform: 'facebook', pageId: entry.id });
  if (!account) return;

  for (const ev of (entry.messaging || [])) {
    if (!ev.message || ev.sender.id === entry.id) continue;

    const conv    = await upsertConversation(account, ev.sender.id, { name: ev.sender.id });
    const body    = ev.message.text || (ev.message.attachments?.length ? '📎 Attachment' : '');
    const message = await Message.create({
      conversation: conv._id,
      direction:    'inbound',
      body,
      externalId:   ev.message.mid,
      sentAt:       new Date(ev.timestamp),
    });

    await Conversation.findByIdAndUpdate(conv._id, {
      lastMessage: body, lastMessageAt: message.sentAt, $inc: { unreadCount: 1 },
      ...(conv.status === 'resolved' ? { status: 'open' } : {}),
    });

    emitToOutlet(account.outlet.toString(), 'new_message', { conversationId: conv._id, message });
  }
}

// TikTok webhook (comment notifications — DM API is gated)
router.get('/webhook/tiktok', (req, res) => {
  res.status(200).send(req.query.challenge || 'ok');
});

router.post('/webhook/tiktok', (req, res) => {
  res.sendStatus(200);
  // Handle TikTok comment events when Business API access is granted
});

// ── Conversations ─────────────────────────────────────────────────────────────

router.get('/conversations', requireAuth, async (req, res) => {
  try {
    const { platform, outlet, status, assignedTo, search, page = 1 } = req.query;
    const filter = {};

    if (platform) filter.platform = platform;
    if (assignedTo) filter.assignedTo = assignedTo === 'me' ? req.user._id : assignedTo;
    if (status) filter.status = status;
    else filter.status = { $ne: 'resolved' };

    if (req.user.role !== 'super_admin') {
      const ids = (req.user.assignedOutlets || []).map(o => o._id || o);
      filter.outlet = { $in: ids };
    } else if (outlet) {
      filter.outlet = outlet;
    }

    if (search) {
      filter.$or = [
        { customerName:   { $regex: search, $options: 'i' } },
        { customerHandle: { $regex: search, $options: 'i' } },
        { lastMessage:    { $regex: search, $options: 'i' } },
      ];
    }

    const limit = 30;
    const skip  = (parseInt(page) - 1) * limit;

    const [conversations, total] = await Promise.all([
      Conversation.find(filter)
        .sort({ unreadCount: -1, lastMessageAt: -1 })
        .skip(skip).limit(limit)
        .populate('outlet', 'name city')
        .populate('assignedTo', 'name')
        .populate('account', 'label'),
      Conversation.countDocuments(filter),
    ]);

    res.json({ success: true, conversations, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/conversations/:id', requireAuth, async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id)
      .populate('outlet', 'name city')
      .populate('assignedTo', 'name username')
      .populate('account', 'label platform pageId')
      .populate('linkedCustomer', 'name phone')
      .populate('linkedOrder', 'orderNumber status');

    if (!conv) return res.status(404).json({ success: false, message: 'Not found' });
    await Conversation.findByIdAndUpdate(req.params.id, { unreadCount: 0 });
    res.json({ success: true, conversation: conv });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/conversations/:id', requireAuth, async (req, res) => {
  try {
    const allowed = ['status', 'assignedTo'];
    const update  = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k] || null; });

    const conv = await Conversation.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('assignedTo', 'name');
    res.json({ success: true, conversation: conv });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/conversations/:id/link', requireAuth, async (req, res) => {
  try {
    const { customerId, orderId } = req.body;
    const update = {};
    if (customerId !== undefined) update.linkedCustomer = customerId || null;
    if (orderId    !== undefined) update.linkedOrder    = orderId    || null;

    const conv = await Conversation.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('linkedCustomer', 'name phone')
      .populate('linkedOrder', 'orderNumber status');
    res.json({ success: true, conversation: conv });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Messages ──────────────────────────────────────────────────────────────────

router.get('/conversations/:id/messages', requireAuth, async (req, res) => {
  try {
    const { before } = req.query;
    const filter     = { conversation: req.params.id };
    if (before) filter.sentAt = { $lt: new Date(before) };

    const messages = await Message.find(filter)
      .sort({ sentAt: -1 })
      .limit(50)
      .populate('sentBy', 'name');

    res.json({ success: true, messages: messages.reverse() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/conversations/:id/reply', requireAuth, async (req, res) => {
  try {
    const { body: text } = req.body;
    if (!text?.trim()) return res.status(400).json({ success: false, message: 'Message body required' });

    const conv = await Conversation.findById(req.params.id).populate('account');
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });

    const { platform, pageId, accessToken } = conv.account;
    let externalId;

    if (['whatsapp', 'instagram', 'facebook'].includes(platform)) {
      const result = await sendMetaMessage(platform, pageId, accessToken, conv.externalId, text.trim());
      externalId   = result.messages?.[0]?.id || result.message_id;
    }

    const message = await Message.create({
      conversation: conv._id,
      direction:    'outbound',
      body:         text.trim(),
      externalId,
      sentBy:       req.user._id,
      sentAt:       new Date(),
      status:       'sent',
    });

    await Conversation.findByIdAndUpdate(conv._id, {
      lastMessage: text.trim(), lastMessageAt: message.sentAt,
    });

    const populated = await Message.findById(message._id).populate('sentBy', 'name');
    emitToOutlet(conv.outlet.toString(), 'new_message', { conversationId: conv._id, message: populated });

    res.json({ success: true, message: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Unread count ──────────────────────────────────────────────────────────────

router.get('/unread', requireAuth, async (req, res) => {
  try {
    const filter = { status: { $ne: 'resolved' }, unreadCount: { $gt: 0 } };
    if (req.user.role !== 'super_admin') {
      const ids    = (req.user.assignedOutlets || []).map(o => o._id || o);
      filter.outlet = { $in: ids };
    }
    const total = await Conversation.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$unreadCount' } } },
    ]);
    res.json({ success: true, unread: total[0]?.total || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
