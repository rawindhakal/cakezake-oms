const express   = require('express');
const bcrypt    = require('bcrypt');
const rateLimit = require('express-rate-limit');
const requireAuth = require('../middleware/auth');
const User      = require('../models/User');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many attempts. Wait 60 seconds.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

async function buildUserPayload(user, session) {
  const Tenant = require('../models/Tenant');

  const base = {
    id:              user._id,
    username:        user.username,
    name:            user.name,
    email:           user.email || null,
    role:            user.role,
    tenantId:        user.tenantId || null,
    assignedOutlets: user.assignedOutlets || [],
    viewingTenant:   null,
    tenant:          null,  // effective tenant for this session
  };

  if (user.role === 'platform_owner') {
    if (session?.viewAsTenantId) {
      try {
        const tenant = await Tenant.findById(session.viewAsTenantId, 'name slug currency orderPrefix isActive').lean();
        if (tenant && tenant.isActive) {
          base.viewingTenant = tenant;
          base.tenant        = tenant;
        } else {
          session.viewAsTenantId = null;
        }
      } catch { /* ignore */ }
    }
  } else if (user.tenantId) {
    try {
      const tenant = await Tenant.findById(user.tenantId, 'name slug currency orderPrefix isActive').lean();
      if (tenant) base.tenant = tenant;
    } catch { /* ignore */ }
  }

  return base;
}

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username/email and password required' });
    }

    const loginKey = username.trim().toLowerCase();
    const user = await User.findOne({
      $or: [{ username: loginKey }, { email: loginKey }],
    }).populate('assignedOutlets', '_id name city');

    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Account is disabled' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    req.session.userId = user._id.toString();
    // Clear any previous tenant-view context on fresh login
    req.session.viewAsTenantId = null;

    const payload = await buildUserPayload(user, req.session);
    res.json({ success: true, user: payload });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

router.get('/verify', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.json({ authenticated: false });
  }
  try {
    const user = await User.findById(req.session.userId).populate('assignedOutlets', '_id name city');
    if (!user || !user.isActive) return res.json({ authenticated: false });
    const payload = await buildUserPayload(user, req.session);
    res.json({ authenticated: true, user: payload });
  } catch {
    res.json({ authenticated: false });
  }
});

router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const match = await bcrypt.compare(currentPassword, req.user.password);
    if (!match) return res.status(401).json({ success: false, message: 'Current password is wrong' });

    const hash = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(req.user._id, { password: hash });
    res.json({ success: true, message: 'Password changed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
