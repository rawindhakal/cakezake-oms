const express = require('express');
const rateLimit = require('express-rate-limit');
const Order = require('../models/Order');

const router = express.Router();

const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many requests. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

// Fields exposed to the customer — no internal notes, no outlet/rider info
const PUBLIC_PROJECTION = {
  orderNumber: 1,
  status: 1,
  createdAt: 1,
  'sender.name': 1,
  'sender.phone': 1,
  'sender.channel': 1,
  'items.name': 1,
  'items.category': 1,
  'items.price': 1,
  'items.flavor': 1,
  'items.size': 1,
  'items.shape': 1,
  'items.cakeMessage': 1,
  'items.arrangement': 1,
  'items.flowerType': 1,
  'items.giftType': 1,
  'items.specialNote': 1,
  'items.itemStatus': 1,
  'items.completedImages': 1,
  'payment.total': 1,
  'payment.advance': 1,
  'payment.due': 1,
  'payment.method': 1,
  'receiver.name': 1,
  'receiver.city': 1,
  'receiver.landmark': 1,
  'delivery.date': 1,
  'delivery.slot': 1,
  'delivery.signature': 1,
  'delivery.signedAt': 1,
  'delivery.receiverConfirmName': 1,
};

// GET /api/track?q=CZ-2025-0001  or  ?q=9812345678
router.get('/', trackLimiter, async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 3) {
    return res.status(400).json({ success: false, message: 'Enter an order number or phone number.' });
  }

  const query = q.trim();

  try {
    let filter;

    // Looks like an order number
    if (/^CZ-/i.test(query)) {
      filter = { orderNumber: { $regex: `^${query}$`, $options: 'i' }, isDeleted: { $ne: true } };
    } else if (/^\d{7,10}$/.test(query)) {
      // Phone number search
      filter = {
        isDeleted: { $ne: true },
        $or: [
          { 'sender.phone': query },
          { 'receiver.phone': query },
        ],
      };
    } else {
      return res.status(400).json({ success: false, message: 'Enter a valid order number (e.g. CZ-2025-0001) or 10-digit phone number.' });
    }

    const orders = await Order.find(filter, PUBLIC_PROJECTION)
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'No orders found. Check your order number or phone number.' });
    }

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
