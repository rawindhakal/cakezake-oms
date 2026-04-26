const express     = require('express');
const EmailConfig = require('../models/EmailConfig');
const { sendTestEmail } = require('../utils/email');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/email-config
router.get('/', async (req, res) => {
  try {
    let cfg = await EmailConfig.findOne().lean();
    if (!cfg) cfg = {};
    const { pass: _p, __v: _v, ...safe } = cfg;
    safe.hasPass = !!cfg.pass;
    res.json({ success: true, config: safe });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/email-config
router.put('/', async (req, res) => {
  try {
    const { enabled, adminEmail, fromName, fromEmail, host, port, secure, user, pass } = req.body;
    const update = {
      enabled:    !!enabled,
      adminEmail: adminEmail || '',
      fromName:   fromName   || '',
      fromEmail:  fromEmail  || '',
      host:       host       || '',
      port:       Number(port) || 587,
      secure:     !!secure,
      user:       user       || '',
    };
    if (pass && pass.trim()) update.pass = pass.trim();

    const cfg = await EmailConfig.findOneAndUpdate({}, { $set: update }, { new: true, upsert: true }).lean();
    const { pass: _p, __v: _v, ...safe } = cfg;
    safe.hasPass = !!cfg.pass;
    res.json({ success: true, config: safe });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/email-config/test
// If no password sent, falls back to the stored DB config
router.post('/test', async (req, res) => {
  try {
    let { host, port, secure, user, pass, fromName, fromEmail, adminEmail } = req.body;

    // If password not provided, load from stored config
    if (!pass || !pass.trim()) {
      const stored = await EmailConfig.findOne().lean();
      if (!stored?.pass) {
        return res.status(400).json({ success: false, message: 'No password saved yet. Enter and save your settings first.' });
      }
      pass     = stored.pass;
      host     = host     || stored.host;
      port     = port     || stored.port;
      secure   = secure   !== undefined ? secure : stored.secure;
      user     = user     || stored.user;
      fromName = fromName || stored.fromName;
      fromEmail = fromEmail || stored.fromEmail;
      adminEmail = adminEmail || stored.adminEmail;
    }

    if (!host || !user) {
      return res.status(400).json({ success: false, message: 'Host and username are required.' });
    }

    await sendTestEmail({ host, port: Number(port) || 587, secure, user, pass, fromName, fromEmail }, adminEmail || user);
    res.json({ success: true, message: 'Test email sent successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
