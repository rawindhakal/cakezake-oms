const express = require('express');
const Order   = require('../models/Order');
const Payment = require('../models/Payment');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// ─── GET /api/customers ───────────────────────────────────────────────────────
// Aggregate all unique senders from orders with their stats + extra payments
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;

    // Aggregate orders by sender.phone
    const matchStage = search
      ? { $or: [{ 'sender.name': { $regex: search, $options: 'i' } }, { 'sender.phone': { $regex: search } }] }
      : {};

    const orderAgg = await Order.aggregate([
      ...(Object.keys(matchStage).length ? [{ $match: matchStage }] : []),
      {
        $group: {
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
        },
      },
      { $sort: { lastOrderDate: -1 } },
      { $limit: 200 },
    ]);

    // Get extra payments grouped by phone
    const paymentAgg = await Payment.aggregate([
      {
        $group: {
          _id:          '$customerPhone',
          extraPaid:    { $sum: '$amount' },
        },
      },
    ]);
    const extraMap = {};
    paymentAgg.forEach((p) => { extraMap[p._id] = p.extraPaid; });

    let customers = orderAgg.map((c) => ({
      name:          c.name,
      phone:         c.phone,
      socialId:      c.socialId || '',
      channel:       c.channel,
      orderCount:    c.orderCount,
      totalAmount:   c.totalAmount,
      totalPaid:     c.totalAdvance + (extraMap[c.phone] || 0),
      totalDue:      Math.max(0, c.totalOrderDue - (extraMap[c.phone] || 0)),
      lastOrderDate: c.lastOrderDate,
      firstOrderDate:c.firstOrderDate,
    }));

    res.json({ success: true, customers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/customers/:phone ─────────────────────────────────────────────────
// Full ledger: all orders + all payments for this phone number
router.get('/:phone', async (req, res) => {
  try {
    const { phone } = req.params;

    const [orders, payments] = await Promise.all([
      Order.find({ 'sender.phone': phone })
        .select('orderNumber sender items payment receiver delivery status createdAt')
        .sort({ createdAt: -1 })
        .lean(),
      Payment.find({ customerPhone: phone }).sort({ createdAt: -1 }),
    ]);

    if (orders.length === 0 && payments.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Derive profile from most recent order
    const latest = orders[0] || {};
    const profile = {
      name:    latest.sender?.name || payments[0]?.customerName,
      phone,
      socialId: latest.sender?.socialId || '',
      channel:  latest.sender?.channel || '',
    };

    const totalAmount  = orders.reduce((s, o) => s + (o.payment?.total   || 0), 0);
    const totalAdvance = orders.reduce((s, o) => s + (o.payment?.advance || 0), 0);
    const totalOrderDue= orders.reduce((s, o) => s + (o.payment?.due     || 0), 0);
    const extraPaid    = payments.reduce((s, p) => s + p.amount, 0);
    const totalDue     = Math.max(0, totalOrderDue - extraPaid);

    res.json({
      success: true,
      profile,
      stats: {
        orderCount:  orders.length,
        totalAmount,
        totalPaid:   totalAdvance + extraPaid,
        totalDue,
      },
      orders,
      payments,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/customers/:phone/payments ───────────────────────────────────────
router.post('/:phone/payments', async (req, res) => {
  try {
    const { phone } = req.params;
    const { amount, method, note, orderId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be positive' });
    }

    // Resolve customer name from latest order
    const latestOrder = await Order.findOne({ 'sender.phone': phone }).sort({ createdAt: -1 });
    if (!latestOrder) {
      return res.status(404).json({ success: false, message: 'No orders found for this customer' });
    }

    const payment = await Payment.create({
      customerPhone: phone,
      customerName:  latestOrder.sender.name,
      amount:        Number(amount),
      method:        method || undefined,
      note:          note   || undefined,
      orderId:       orderId || undefined,
    });

    res.json({ success: true, payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/customers/:phone/payments/:id ────────────────────────────────
router.delete('/:phone/payments/:id', async (req, res) => {
  try {
    await Payment.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
