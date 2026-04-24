const express = require('express');
const Order = require('../models/Order');
const Outlet = require('../models/Outlet');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Simple in-memory cache: key → { data, expiresAt }
const cache = new Map();
function getCached(key) {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  return null;
}
function setCached(key, data, ttlMs) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}
function bustCache() {
  cache.clear();
}

function parseRange(query) {
  const now = new Date();
  const start = query.startDate ? new Date(query.startDate) : (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })();
  const end   = query.endDate   ? new Date(query.endDate)   : (() => { const d = new Date(); d.setHours(23,59,59,999); return d; })();
  return { start, end };
}

function fillDailyGaps(rows, start, end) {
  const map = {};
  rows.forEach((r) => { map[r.date] = r; });
  const result = [];
  const cur = new Date(start);
  cur.setHours(0,0,0,0);
  const last = new Date(end);
  last.setHours(23,59,59,999);
  while (cur <= last) {
    const key = cur.toISOString().slice(0,10);
    const label = cur.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    result.push({ date: key, label, revenue: map[key]?.revenue || 0, orders: map[key]?.orders || 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

// Fast summary-only endpoint — returns just the numbers, no charts
router.get('/summary-quick', async (req, res) => {
  try {
    const cacheKey = `summary:${JSON.stringify(req.query)}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const { start, end } = parseRange(req.query);
    const rangeBase  = { createdAt: { $gte: start, $lte: end }, isDeleted: { $ne: true } };
    const activeBase = { status: { $nin: ['Delivered','Cancelled'] }, isDeleted: { $ne: true } };

    const [summaryAgg, totalDueAgg, statusCountsAgg] = await Promise.all([
      Order.aggregate([
        { $match: { ...rangeBase, status: { $ne: 'Cancelled' } } },
        { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$payment.total' }, collected: { $sum: '$payment.advance' }, due: { $sum: '$payment.due' } } },
      ]),
      Order.aggregate([
        { $match: activeBase },
        { $group: { _id: null, due: { $sum: '$payment.due' } } },
      ]),
      Order.aggregate([
        { $match: { isDeleted: { $ne: true }, status: { $nin: ['Delivered','Cancelled'] } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const statusCounts = {};
    statusCountsAgg.forEach((r) => { statusCounts[r._id] = r.count; });
    const s = summaryAgg[0] || {};

    const result = {
      success: true,
      summary: {
        ordersInRange:    s.count        || 0,
        revenueInRange:   s.revenue      || 0,
        collectedInRange: s.collected    || 0,
        dueInRange:       s.due          || 0,
        totalDue:         totalDueAgg[0]?.due || 0,
        avgOrderValue:    s.count ? Math.round((s.revenue || 0) / s.count) : 0,
        inProduction:     statusCounts['In Production']   || 0,
        outForDelivery:   statusCounts['Out for Delivery'] || 0,
        newOrders:        statusCounts['New']              || 0,
      },
    };
    setCached(cacheKey, result, 30000);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Main comprehensive dashboard endpoint
router.get('/dashboard', async (req, res) => {
  try {
    const cacheKey = `dashboard:${JSON.stringify(req.query)}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const { start, end } = parseRange(req.query);

    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd   = new Date(); todayEnd.setHours(23,59,59,999);

    const rangeBase  = { createdAt: { $gte: start, $lte: end }, isDeleted: { $ne: true } };
    const activeBase = { status: { $nin: ['Delivered','Cancelled'] }, isDeleted: { $ne: true } };

    const [
      summaryAgg,
      byStatus,
      byChannel,
      byCity,
      revenueChartRaw,
      totalDueAgg,
      statusCountsAgg,
      todayDeliveries,
      outletsOverviewRaw,
      topItems,
      byPaymentMethod,
    ] = await Promise.all([
      // Summary within range (non-cancelled)
      Order.aggregate([
        { $match: { ...rangeBase, status: { $ne: 'Cancelled' } } },
        { $group: {
          _id: null,
          count:     { $sum: 1 },
          revenue:   { $sum: '$payment.total' },
          collected: { $sum: '$payment.advance' },
          due:       { $sum: '$payment.due' },
        }},
      ]),

      // Status breakdown in range
      Order.aggregate([
        { $match: rangeBase },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Channel breakdown in range
      Order.aggregate([
        { $match: { ...rangeBase, status: { $ne: 'Cancelled' } } },
        { $group: { _id: '$sender.channel', count: { $sum: 1 }, revenue: { $sum: '$payment.total' } } },
        { $sort: { count: -1 } },
      ]),

      // City breakdown in range
      Order.aggregate([
        { $match: { ...rangeBase, status: { $ne: 'Cancelled' } } },
        { $group: { _id: '$receiver.city', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),

      // Daily revenue chart for range
      Order.aggregate([
        { $match: { ...rangeBase, status: { $ne: 'Cancelled' } } },
        { $group: {
          _id:     { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kathmandu' } },
          revenue: { $sum: '$payment.total' },
          orders:  { $sum: 1 },
        }},
        { $sort: { _id: 1 } },
        { $project: { date: '$_id', revenue: 1, orders: 1, _id: 0 } },
      ]),

      // Total outstanding due (all active, not range-filtered)
      Order.aggregate([
        { $match: activeBase },
        { $group: { _id: null, due: { $sum: '$payment.due' } } },
      ]),

      // Active order status counts (pipeline-wide)
      Order.aggregate([
        { $match: { isDeleted: { $ne: true }, status: { $nin: ['Delivered','Cancelled'] } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Today's deliveries (always today regardless of range)
      Order.find({
        'delivery.date': { $gte: todayStart, $lte: todayEnd },
        status: { $nin: ['Cancelled'] },
        isDeleted: { $ne: true },
      })
        .populate('outlet', 'name city')
        .sort('delivery.slot')
        .limit(100)
        .lean(),

      // Per-outlet breakdown in range
      Order.aggregate([
        { $match: { ...rangeBase, status: { $ne: 'Cancelled' } } },
        {
          $group: {
            _id: { outlet: '$outlet', status: '$status' },
            count:   { $sum: 1 },
            revenue: { $sum: '$payment.total' },
            due:     { $sum: '$payment.due' },
          },
        },
        {
          $group: {
            _id:         '$_id.outlet',
            totalOrders: { $sum: '$count' },
            revenue:     { $sum: '$revenue' },
            due:         { $sum: '$due' },
            statuses:    { $push: { status: '$_id.status', count: '$count' } },
          },
        },
        { $lookup: { from: 'outlets', localField: '_id', foreignField: '_id', as: 'outletInfo' } },
        { $unwind: { path: '$outletInfo', preserveNullAndEmptyArrays: true } },
        { $sort: { totalOrders: -1 } },
      ]),

      // Top selling item names
      Order.aggregate([
        { $match: { ...rangeBase, status: { $ne: 'Cancelled' } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.name', count: { $sum: 1 }, revenue: { $sum: '$items.price' } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),

      // Revenue collected per payment method
      Order.aggregate([
        { $match: { ...rangeBase, status: { $ne: 'Cancelled' }, 'payment.method': { $exists: true, $ne: null } } },
        { $group: {
          _id:       '$payment.method',
          collected: { $sum: '$payment.advance' },
          total:     { $sum: '$payment.total' },
          count:     { $sum: 1 },
        }},
        { $sort: { collected: -1 } },
      ]),
    ]);

    // Also fetch all outlets to include ones with zero orders
    const allOutlets = await Outlet.find({ isActive: true }, '_id name city').lean();

    const outletMap = {};
    outletsOverviewRaw.forEach((r) => {
      const id = r._id?.toString() || 'unassigned';
      outletMap[id] = {
        outlet: r.outletInfo || { _id: null, name: 'Unassigned', city: '' },
        totalOrders: r.totalOrders,
        revenue:     r.revenue,
        due:         r.due,
        statuses:    Object.fromEntries(r.statuses.map((s) => [s.status, s.count])),
      };
    });

    // Merge active outlets with zero orders
    allOutlets.forEach((o) => {
      if (!outletMap[o._id.toString()]) {
        outletMap[o._id.toString()] = {
          outlet: o, totalOrders: 0, revenue: 0, due: 0, statuses: {},
        };
      }
    });

    // Today active counts per outlet
    const todayActiveCounts = await Order.aggregate([
      { $match: {
        'delivery.date': { $gte: todayStart, $lte: todayEnd },
        status: { $nin: ['Delivered','Cancelled'] },
        isDeleted: { $ne: true },
      }},
      { $group: { _id: '$outlet', count: { $sum: 1 } } },
    ]);
    const todayActiveMap = {};
    todayActiveCounts.forEach((r) => { todayActiveMap[r._id?.toString() || 'unassigned'] = r.count; });
    Object.values(outletMap).forEach((o) => {
      const id = o.outlet?._id?.toString() || 'unassigned';
      o.todayActive = todayActiveMap[id] || 0;
    });

    const statusCounts = {};
    statusCountsAgg.forEach((r) => { statusCounts[r._id] = r.count; });

    const s = summaryAgg[0] || {};
    const revenueChart = fillDailyGaps(revenueChartRaw, start, end);

    const result = {
      success: true,
      range: { start: start.toISOString(), end: end.toISOString() },
      summary: {
        ordersInRange: s.count     || 0,
        revenueInRange: s.revenue  || 0,
        collectedInRange: s.collected || 0,
        dueInRange: s.due          || 0,
        totalDue: totalDueAgg[0]?.due || 0,
        avgOrderValue: s.count ? Math.round((s.revenue || 0) / s.count) : 0,
        inProduction:   statusCounts['In Production']   || 0,
        outForDelivery: statusCounts['Out for Delivery'] || 0,
        newOrders:      statusCounts['New']              || 0,
      },
      byStatus,
      byChannel,
      byCity,
      byPaymentMethod,
      revenueChart,
      todayDeliveries,
      outletsOverview: Object.values(outletMap),
      topItems,
    };
    setCached(cacheKey, result, 60000);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Keep legacy endpoints for backwards compat
router.get('/summary',      async (req, res) => {
  const { start, end } = parseRange(req.query);
  try {
    const [todayOrders, revenueAgg, totalDueAgg, pendingCount] = await Promise.all([
      Order.countDocuments({ 'delivery.date': { $gte: start, $lte: end }, status: { $ne: 'Cancelled' }, isDeleted: { $ne: true } }),
      Order.aggregate([{ $match: { createdAt: { $gte: start, $lte: end }, status: { $ne: 'Cancelled' }, isDeleted: { $ne: true } } }, { $group: { _id: null, total: { $sum: '$payment.total' } } }]),
      Order.aggregate([{ $match: { status: { $nin: ['Delivered','Cancelled'] }, isDeleted: { $ne: true } } }, { $group: { _id: null, due: { $sum: '$payment.due' } } }]),
      Order.countDocuments({ status: 'In Production', isDeleted: { $ne: true } }),
    ]);
    res.json({ success: true, todayOrders, todayRevenue: revenueAgg[0]?.total || 0, totalDue: totalDueAgg[0]?.due || 0, pendingCount });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/by-channel',   async (req, res) => {
  try {
    const data = await Order.aggregate([{ $match: { status: { $ne: 'Cancelled' }, isDeleted: { $ne: true } } }, { $group: { _id: '$sender.channel', count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/by-city',      async (req, res) => {
  try {
    const data = await Order.aggregate([{ $match: { status: { $ne: 'Cancelled' }, isDeleted: { $ne: true } } }, { $group: { _id: '$receiver.city', count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/by-status',    async (req, res) => {
  try {
    const data = await Order.aggregate([{ $match: { isDeleted: { $ne: true } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/revenue-7days', async (req, res) => {
  try {
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6-i)); d.setHours(0,0,0,0); return d; });
    const data = await Promise.all(days.map(async (day) => {
      const next = new Date(day); next.setDate(next.getDate() + 1);
      const agg = await Order.aggregate([{ $match: { createdAt: { $gte: day, $lt: next }, status: { $ne: 'Cancelled' }, isDeleted: { $ne: true } } }, { $group: { _id: null, revenue: { $sum: '$payment.total' } } }]);
      return { date: day.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }), revenue: agg[0]?.revenue || 0 };
    }));
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
module.exports.bustStatsCache = bustCache;
