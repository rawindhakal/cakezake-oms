const express = require('express');
const { body, validationResult } = require('express-validator');
const XLSX = require('xlsx');
const Order = require('../models/Order');
const requireAuth = require('../middleware/auth');
const generateOrderNumber = require('../utils/orderNumber');
const { sendOrderConfirmation, sendDeliveryReminder } = require('../utils/notify');
const { bustStatsCache } = require('./stats');

const router = express.Router();
router.use(requireAuth);

const validateOrder = [
  body('sender.name').trim().notEmpty(),
  body('sender.phone').matches(/^(97|98)\d{8}$/),
  body('sender.channel').isIn(['Instagram', 'Facebook', 'WhatsApp', 'Website', 'Walk-in', 'Phone Call']),
  body('items').isArray({ min: 1 }),
  body('items.*.name').trim().notEmpty(),
  body('items.*.price').isFloat({ min: 0 }),
  body('receiver.name').trim().notEmpty(),
  body('receiver.phone').matches(/^(97|98)\d{8}$/),
  body('receiver.city').trim().notEmpty(),
  body('delivery.date').isISO8601(),
];

router.get('/', async (req, res) => {
  try {
    const { status, city, channel, search, startDate, endDate, page = 1, limit = 20, archived } = req.query;

    // archived=true → show deleted orders; otherwise exclude them
    const filter = archived === 'true' ? { isDeleted: true } : { isDeleted: { $ne: true } };

    if (status) filter.status = status;
    if (city) filter['receiver.city'] = city;
    if (channel) filter['sender.channel'] = channel;
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'sender.name': { $regex: search, $options: 'i' } },
        { 'sender.phone': { $regex: search, $options: 'i' } },
      ];
    }
    if (startDate || endDate) {
      filter['delivery.date'] = {};
      if (startDate) filter['delivery.date'].$gte = new Date(startDate);
      if (endDate)   filter['delivery.date'].$lte = new Date(endDate);
    }
    if (req.query.outlet)        filter.outlet        = req.query.outlet;
    if (req.query.assignedRider) filter.assignedRider = req.query.assignedRider;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .select('orderNumber sender.name sender.phone sender.channel items.name items.price payment.total payment.due payment.advance receiver.city receiver.name delivery.date delivery.slot status outlet assignedRider createdAt')
        .populate('outlet', 'name city')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments(filter),
    ]);

    res.json({ success: true, orders, total, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('outlet', 'name city kitchen prepArea')
      .populate('assignedRider', 'name username');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', validateOrder, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const data = req.body;

    // Recompute totals server-side
    const total = data.items.reduce((sum, item) => sum + Number(item.price), 0);
    const advance = Number(data.payment?.advance) || 0;
    const due = total - advance;

    const orderNumber = await generateOrderNumber();

    const order = await Order.create({
      ...data,
      orderNumber,
      payment: { ...data.payment, total, advance, due },
    });

    bustStatsCache();
    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const data = req.body;

    if (data.items?.length) {
      const total = data.items.reduce((sum, item) => sum + Number(item.price), 0);
      const advance = Number(data.payment?.advance) || 0;
      data.payment = { ...data.payment, total, advance, due: total - advance };
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { ...data, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).populate('outlet', 'name city kitchen prepArea');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    bustStatsCache();
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['New', 'Confirmed', 'In Production', 'Out for Delivery', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/:id/items/:itemId/status', async (req, res) => {
  try {
    const { itemStatus } = req.body;
    const valid = ['Pending', 'Preparing', 'Prepared'];
    if (!valid.includes(itemStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid item status' });
    }
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, 'items._id': req.params.itemId },
      { $set: { 'items.$.itemStatus': itemStatus } },
      { new: true }
    ).populate('outlet', 'name city kitchen prepArea');
    if (!order) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Assign a delivery rider to an order
router.patch('/:id/assign-rider', async (req, res) => {
  try {
    const { riderId } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { assignedRider: riderId || null },
      { new: true }
    ).populate('assignedRider', 'name username');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Rider collects signature and marks order as Delivered
router.post('/:id/sign-delivery', async (req, res) => {
  try {
    const { signature, receiverConfirmName } = req.body;
    if (!signature) return res.status(400).json({ success: false, message: 'Signature required' });
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status: 'Delivered',
        'delivery.signature':           signature,
        'delivery.signedAt':            new Date(),
        'delivery.receiverConfirmName': receiverConfirmName || '',
      },
      { new: true }
    ).populate('assignedRider', 'name username').populate('outlet', 'name city');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Mark item as Prepared and attach a completed product photo
router.post('/:id/items/:itemId/complete-image', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, message: 'Image URL required' });
    }
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, 'items._id': req.params.itemId },
      {
        $set:  { 'items.$.itemStatus': 'Prepared' },
        $push: { 'items.$.completedImages': url },
      },
      { new: true }
    ).populate('outlet', 'name city kitchen prepArea');
    if (!order) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true },
    );
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/:id/restore', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { isDeleted: false, $unset: { deletedAt: '' } },
      { new: true },
    );
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/:id/notify', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    await sendOrderConfirmation(order);
    res.json({ success: true, message: 'WhatsApp sent' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/:id/remind', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    await sendDeliveryReminder(order);
    res.json({ success: true, message: 'Reminder sent' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/export', async (req, res) => {
  try {
    const orders = await Order.find({ status: { $ne: 'Cancelled' } }).sort({ createdAt: -1 });
    const rows = orders.map((o) => ({
      'Order#': o.orderNumber,
      'Date': o.delivery.date ? new Date(o.delivery.date).toLocaleDateString('en-IN') : '',
      'Sender': o.sender.name,
      'Sender Phone': o.sender.phone,
      'Channel': o.sender.channel,
      'Items': o.items.map((i) => i.name).join(', '),
      'Total (NPR)': o.payment.total,
      'Advance (NPR)': o.payment.advance,
      'Due (NPR)': o.payment.due,
      'Method': o.payment.method || '',
      'Receiver': o.receiver.name,
      'Receiver Phone': o.receiver.phone,
      'City': o.receiver.city,
      'Slot': o.delivery.slot || '',
      'Status': o.status,
      'Note': o.note || '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=cakezake-orders.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
