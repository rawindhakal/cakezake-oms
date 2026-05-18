const express    = require('express');
const AuditLog   = require('../models/AuditLog');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/activity?limit=30
router.get('/', async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 30, 100);
    const filter = req.tenantId ? { tenantId: req.tenantId } : {};
    const logs   = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
