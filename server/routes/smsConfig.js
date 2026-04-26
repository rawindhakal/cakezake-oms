const express   = require('express');
const SmsConfig = require('../models/SmsConfig');
const { sendSMS } = require('../utils/sms');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/sms-config
router.get('/', async (req, res) => {
  try {
    let cfg = await SmsConfig.findOne().lean();
    if (!cfg) cfg = { enabled: false, senderId: 'CakeZake' };
    const { token: _, ...safe } = cfg;
    safe.hasToken = !!cfg.token;
    res.json({ success: true, config: safe });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/sms-config
router.put('/', async (req, res) => {
  try {
    const { enabled, senderId, token } = req.body;
    const update = { enabled, senderId };
    if (token && token.trim()) update.token = token.trim();

    const cfg = await SmsConfig.findOneAndUpdate({}, { $set: update }, { new: true, upsert: true }).lean();
    const { token: _, ...safe } = cfg;
    safe.hasToken = !!cfg.token;
    res.json({ success: true, config: safe });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/sms-config/test  { phone }
router.post('/test', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number required' });
    const result = await sendSMS(phone, 'CakeZake SMS test — your configuration is working!');
    if (!result.success) return res.status(400).json({ success: false, message: result.error || 'SMS failed' });
    res.json({ success: true, message: 'Test SMS sent!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
