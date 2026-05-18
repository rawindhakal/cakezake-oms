const express  = require('express');
const mongoose = require('mongoose');
const Order    = require('../models/Order');
const Payment  = require('../models/Payment');
const requireAuth = require('../middleware/auth');
const { normalizeOrderPhone } = require('../utils/phone');

const router = express.Router();
router.use(requireAuth);

function tenantScope(req, extra = {}) {
  return req.tenantId ? { tenantId: req.tenantId, ...extra } : extra;
}

// GET /api/customers
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const matchBase  = tenantScope(req);

    if (search) {
      matchBase.$or = [
        { 'sender.name':  { $regex: search, $options: 'i' } },
        { 'sender.phone': { $regex: search } },
      ];
    }

    const orderAgg = await Order.aggregate([
      { $match: matchBase },
      { $group: {
        _id:           '$sender.phone',
        name:          { $last:  '$sender.name' },
        phone:         { $first: '$sender.phone' },
        socialId:      { $last:  '$sender.socialId' },
        channel:       { $last:  '$sender.channel' },
        orderCount:    { $sum: 1 },
        totalAmount:   { $sum: '$payment.total' },
        totalAdvance:  { $sum: '$payment.advance' },
        totalOrderDue: { $sum: '$payment.due' },
        lastOrderDate: { $max: '$createdAt' },
        firstOrderDate:{ $min: '$createdAt' },
      }},
      { $sort: { lastOrderDate: -1 } },
      { $limit: 200 },
    ]);

    const paymentFilter = req.tenantId ? { tenantId: req.tenantId } : {};
    const paymentAgg    = await Payment.aggregate([
      { $match: paymentFilter },
      { $group: { _id: '$customerPhone', extraPaid: { $sum: '$amount' } } },
    ]);
    const extraMap = {};
    paymentAgg.forEach((p) => { extraMap[p._id] = p.extraPaid; });

    const customers = orderAgg.map((c) => ({
      name:           c.name,
      phone:          c.phone,
      socialId:       c.socialId  || '',
      channel:        c.channel,
      orderCount:     c.orderCount,
      totalAmount:    c.totalAmount,
      totalPaid:      c.totalAdvance + (extraMap[c.phone] || 0),
      totalDue:       Math.max(0, c.totalOrderDue - (extraMap[c.phone] || 0)),
      lastOrderDate:  c.lastOrderDate,
      firstOrderDate: c.firstOrderDate,
    }));

    res.json({ success: true, customers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/customers/:phone
router.get('/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    let phoneKey = phone;
    try { phoneKey = normalizeOrderPhone(phone); } catch { /* use raw */ }

    const orderFilter   = tenantScope(req, { 'sender.phone': phoneKey });
    const paymentFilter = req.tenantId ? { tenantId: req.tenantId, customerPhone: phoneKey } : { customerPhone: phoneKey };

    const [orders, payments] = await Promise.all([
      Order.find(orderFilter).select('orderNumber sender items payment receiver delivery status createdAt').sort({ createdAt: -1 }).lean(),
      Payment.find(paymentFilter).sort({ createdAt: -1 }).lean(),
    ]);

    if (orders.length === 0 && payments.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const latest  = orders[0] || {};
    const profile = {
      name:     latest.sender?.name || payments[0]?.customerName,
      phone:    phoneKey,
      socialId: latest.sender?.socialId || '',
      channel:  latest.sender?.channel  || '',
    };

    const totalAmount   = orders.reduce((s, o) => s + (o.payment?.total   || 0), 0);
    const totalAdvance  = orders.reduce((s, o) => s + (o.payment?.advance || 0), 0);
    const totalOrderDue = orders.reduce((s, o) => s + (o.payment?.due     || 0), 0);
    const extraPaid     = payments.reduce((s, p) => s + p.amount, 0);
    const totalDue      = Math.max(0, totalOrderDue - extraPaid);

    res.json({ success: true, profile, stats: { orderCount: orders.length, totalAmount, totalPaid: totalAdvance + extraPaid, totalDue }, orders, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/customers/:phone/payments
router.post('/:phone/payments', async (req, res) => {
  try {
    const { phone } = req.params;
    const { amount, method, note, orderId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be positive' });
    }
    if (!orderId || !mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ success: false, message: 'A valid order is required' });
    }

    let normCustomer;
    try { normCustomer = normalizeOrderPhone(phone); }
    catch (e) { return res.status(400).json({ success: false, message: e.message || 'Invalid phone' }); }

    const orderFilter = tenantScope(req, { _id: orderId });
    const order = await Order.findOne(orderFilter);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.isDeleted) return res.status(400).json({ success: false, message: 'Cannot record payment for a deleted order' });
    if (order.sender.phone !== normCustomer) return res.status(403).json({ success: false, message: 'Order does not belong to this customer' });

    const payment = await Payment.create({
      customerPhone: order.sender.phone,
      customerName:  order.sender.name,
      amount:        Number(amount),
      method:        method    || undefined,
      note:          note      || undefined,
      orderId:       order._id,
      orderNumber:   order.orderNumber || '',
      tenantId:      req.tenantId,
    });

    res.json({ success: true, payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/customers/:phone/payments/:id
router.delete('/:phone/payments/:id', async (req, res) => {
  try {
    const doc = await Payment.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Payment not found' });
    if (req.tenantId && String(doc.tenantId) !== String(req.tenantId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    let normUrl, normStored;
    try {
      normUrl    = normalizeOrderPhone(req.params.phone);
      normStored = normalizeOrderPhone(doc.customerPhone);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid phone' });
    }
    if (normUrl !== normStored) return res.status(403).json({ success: false, message: 'Forbidden' });

    await Payment.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
