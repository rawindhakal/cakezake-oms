const express = require('express');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const requireAuth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many attempts. Wait 60 seconds.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    const user = await User.findOne({ username: username.trim().toLowerCase() }).populate('assignedOutlets', '_id name city');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is disabled' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    req.session.userId = user._id.toString();
    res.json({
      success: true,
      user: {
        id:              user._id,
        username:        user.username,
        name:            user.name,
        role:            user.role,
        assignedOutlets: user.assignedOutlets,
      },
    });
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
    res.json({
      authenticated: true,
      user: {
        id:              user._id,
        username:        user.username,
        name:            user.name,
        role:            user.role,
        assignedOutlets: user.assignedOutlets,
      },
    });
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
    if (!match) {
      return res.status(401).json({ success: false, message: 'Current password is wrong' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(req.user._id, { password: hash });
    res.json({ success: true, message: 'Password changed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
