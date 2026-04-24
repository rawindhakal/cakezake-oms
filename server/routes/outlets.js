const express = require('express');
const { body, validationResult } = require('express-validator');
const Outlet = require('../models/Outlet');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const validate = [
  body('name').trim().notEmpty().withMessage('Outlet name required'),
  body('city').trim().notEmpty().withMessage('City required'),
];

router.get('/', async (req, res) => {
  try {
    const outlets = await Outlet.find().sort({ createdAt: 1 });
    res.json({ success: true, outlets });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const outlet = await Outlet.findById(req.params.id);
    if (!outlet) return res.status(404).json({ success: false, message: 'Outlet not found' });
    res.json({ success: true, outlet });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', validate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const outlet = await Outlet.create(req.body);
    res.status(201).json({ success: true, outlet });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', validate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const outlet = await Outlet.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!outlet) return res.status(404).json({ success: false, message: 'Outlet not found' });
    res.json({ success: true, outlet });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/:id/toggle', async (req, res) => {
  try {
    const outlet = await Outlet.findById(req.params.id);
    if (!outlet) return res.status(404).json({ success: false, message: 'Outlet not found' });
    outlet.isActive = !outlet.isActive;
    await outlet.save();
    res.json({ success: true, outlet });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const outlet = await Outlet.findByIdAndDelete(req.params.id);
    if (!outlet) return res.status(404).json({ success: false, message: 'Outlet not found' });
    res.json({ success: true, message: 'Outlet deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
