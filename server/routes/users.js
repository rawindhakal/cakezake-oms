const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const requireAuth = require('../middleware/auth');
const requireSuperAdmin = require('../middleware/requireSuperAdmin');
const User = require('../models/User');

const router = express.Router();

// Public (auth only) — list riders for assignment dropdowns
router.get('/riders', requireAuth, async (req, res) => {
  try {
    const { outlet } = req.query;
    const filter = { role: 'rider', isActive: true };
    // Riders explicitly linked to this outlet, OR riders with no outlet restriction (empty / unset list)
    if (outlet && mongoose.Types.ObjectId.isValid(outlet)) {
      filter.$or = [
        { assignedOutlets: outlet },
        { assignedOutlets: { $exists: false } },
        { assignedOutlets: { $size: 0 } },
      ];
    }
    const riders = await User.find(filter, '-password').populate('assignedOutlets', '_id name city').sort({ name: 1 });
    res.json({ success: true, riders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.use(requireAuth, requireSuperAdmin);

// List all users
router.get('/', async (req, res) => {
  try {
    const { role } = req.query;
    const filter = {};
    if (role) filter.role = role;
    const users = await User.find(filter, '-password').populate('assignedOutlets', '_id name city').sort({ createdAt: 1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create user
router.post('/', async (req, res) => {
  try {
    const { username, password, name, role, assignedOutlets } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ success: false, message: 'username, password and name are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ username: username.trim().toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Username already taken' });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: username.trim().toLowerCase(),
      password: hash,
      name:     name.trim(),
      role:     role || 'staff',
      assignedOutlets: assignedOutlets || [],
    });

    const populated = await User.findById(user._id, '-password').populate('assignedOutlets', '_id name city');
    res.status(201).json({ success: true, user: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const { name, role, assignedOutlets, isActive } = req.body;
    const update = {};
    if (name      !== undefined) update.name            = name.trim();
    if (role      !== undefined) update.role            = role;
    if (assignedOutlets !== undefined) update.assignedOutlets = assignedOutlets;
    if (isActive  !== undefined) update.isActive        = isActive;

    // Prevent removing super_admin role from yourself
    if (req.params.id === req.user._id.toString() && role && role !== 'super_admin') {
      return res.status(400).json({ success: false, message: "You can't demote yourself" });
    }

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
      .select('-password').populate('assignedOutlets', '_id name city');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Reset password
router.post('/:id/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    const user = await User.findByIdAndUpdate(req.params.id, { password: hash });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'Password reset' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "You can't delete yourself" });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
