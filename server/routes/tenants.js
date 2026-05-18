const express  = require('express');
const bcrypt   = require('bcrypt');
const Tenant   = require('../models/Tenant');
const User     = require('../models/User');
const Order    = require('../models/Order');
const AuditLog = require('../models/AuditLog');
const requireAuth           = require('../middleware/auth');
const requirePlatformOwner  = require('../middleware/requirePlatformOwner');

const router = express.Router();
router.use(requireAuth, requirePlatformOwner);

// GET /api/tenants — all tenants with basic stats
router.get('/', async (req, res) => {
  try {
    const tenants = await Tenant.find().sort({ createdAt: -1 }).lean();

    const enriched = await Promise.all(tenants.map(async (t) => {
      const [userCount, orderCount, revenueAgg, lastOrder] = await Promise.all([
        User.countDocuments({ tenantId: t._id }),
        Order.countDocuments({ tenantId: t._id, isDeleted: { $ne: true } }),
        Order.aggregate([
          { $match: { tenantId: t._id, isDeleted: { $ne: true } } },
          { $group: { _id: null, total: { $sum: '$payment.total' }, due: { $sum: '$payment.due' } } },
        ]),
        Order.findOne({ tenantId: t._id, isDeleted: { $ne: true } }, 'createdAt').sort({ createdAt: -1 }).lean(),
      ]);
      return { ...t, userCount, orderCount, totalRevenue: revenueAgg[0]?.total || 0, totalDue: revenueAgg[0]?.due || 0, lastOrderAt: lastOrder?.createdAt || null };
    }));

    res.json({ success: true, tenants: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/tenants — create tenant
router.post('/', async (req, res) => {
  try {
    const { name, slug, ownerName, ownerEmail, phone, address, city, country, currency, orderPrefix, plan, notes, planExpiresAt, maxOrders } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ success: false, message: 'name and slug are required' });
    }

    const slugKey = slug.toLowerCase().trim();
    const existing = await Tenant.findOne({ slug: slugKey });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Slug already taken' });
    }

    const tenant = await Tenant.create({
      name: name.trim(),
      slug: slugKey,
      ownerName, ownerEmail, phone, address, city,
      country:     country     || 'Nepal',
      currency:    currency    || 'NPR',
      orderPrefix: (orderPrefix || 'CZ').toUpperCase(),
      plan:        plan        || 'free',
      notes,
      planActivatedAt: new Date(),
      ...(planExpiresAt && { planExpiresAt: new Date(planExpiresAt) }),
      ...(maxOrders != null && { maxOrders }),
    });

    await seedTenantDefaults(tenant._id);
    res.status(201).json({ success: true, tenant });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/tenants/switch-context  { tenantId }
router.post('/switch-context', async (req, res) => {
  try {
    const { tenantId } = req.body;
    if (!tenantId) {
      req.session.viewAsTenantId = null;
      return res.json({ success: true, viewingTenant: null });
    }
    const tenant = await Tenant.findById(tenantId, 'name slug currency orderPrefix isActive').lean();
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });
    if (!tenant.isActive) return res.status(400).json({ success: false, message: 'Tenant is inactive' });
    req.session.viewAsTenantId = tenant._id.toString();
    res.json({ success: true, viewingTenant: tenant });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/tenants/switch-context — clear tenant view context
router.delete('/switch-context', (req, res) => {
  req.session.viewAsTenantId = null;
  res.json({ success: true });
});

// GET /api/tenants/analytics — platform-wide analytics
router.get('/analytics', async (req, res) => {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [monthlyRevenue, tenantRevenue, recentActivity] = await Promise.all([
      // Monthly platform revenue + orders for last 6 months
      Order.aggregate([
        { $match: { isDeleted: { $ne: true }, status: { $ne: 'Cancelled' }, createdAt: { $gte: sixMonthsAgo } } },
        { $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'Asia/Kathmandu' } },
            revenue: { $sum: '$payment.total' },
            orders:  { $sum: 1 },
        }},
        { $sort: { _id: 1 } },
        { $project: { month: '$_id', revenue: 1, orders: 1, _id: 0 } },
      ]),
      // Per-tenant aggregated stats
      Order.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: {
            _id: '$tenantId',
            revenue: { $sum: '$payment.total' },
            orders:  { $sum: 1 },
            due:     { $sum: '$payment.due' },
        }},
        { $lookup: { from: 'tenants', localField: '_id', foreignField: '_id', as: 'tenant' } },
        { $unwind: { path: '$tenant', preserveNullAndEmptyArrays: true } },
        { $project: { tenantId: '$_id', tenantName: '$tenant.name', tenantSlug: '$tenant.slug', revenue: 1, orders: 1, due: 1, _id: 0 } },
        { $sort: { revenue: -1 } },
      ]),
      // Recent audit activity (last 20 entries across all tenants)
      AuditLog.find({}).sort({ createdAt: -1 }).limit(20).lean(),
    ]);

    // Fill any missing months with zeros
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const found = monthlyRevenue.find((r) => r.month === key);
      months.push({ month: key, label, revenue: found?.revenue || 0, orders: found?.orders || 0 });
    }

    res.json({ success: true, monthlyRevenue: months, tenantRevenue, recentActivity });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/tenants/:id — detail + users + stats
router.get('/:id', async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id).lean();
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });

    const [users, orderCount, revenueAgg] = await Promise.all([
      User.find({ tenantId: tenant._id }, '-password').lean(),
      Order.countDocuments({ tenantId: tenant._id, isDeleted: { $ne: true } }),
      Order.aggregate([
        { $match: { tenantId: tenant._id, status: { $ne: 'Cancelled' }, isDeleted: { $ne: true } } },
        { $group: { _id: null, total: { $sum: '$payment.total' }, due: { $sum: '$payment.due' } } },
      ]),
    ]);

    res.json({
      success: true,
      tenant: {
        ...tenant,
        users,
        orderCount,
        totalRevenue: revenueAgg[0]?.total || 0,
        totalDue:     revenueAgg[0]?.due   || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/tenants/:id — update tenant
router.put('/:id', async (req, res) => {
  try {
    const { name, ownerName, ownerEmail, phone, address, city, country, currency, orderPrefix, plan, notes, isActive, planExpiresAt, planActivatedAt, maxOrders } = req.body;
    const update = {};
    if (name             !== undefined) update.name             = name.trim();
    if (ownerName        !== undefined) update.ownerName        = ownerName;
    if (ownerEmail       !== undefined) update.ownerEmail       = ownerEmail;
    if (phone            !== undefined) update.phone            = phone;
    if (address          !== undefined) update.address          = address;
    if (city             !== undefined) update.city             = city;
    if (country          !== undefined) update.country          = country;
    if (currency         !== undefined) update.currency         = currency;
    if (orderPrefix      !== undefined) update.orderPrefix      = orderPrefix.toUpperCase();
    if (plan             !== undefined) update.plan             = plan;
    if (notes            !== undefined) update.notes            = notes;
    if (isActive         !== undefined) update.isActive         = isActive;
    if (planExpiresAt    !== undefined) update.planExpiresAt    = planExpiresAt ? new Date(planExpiresAt) : null;
    if (planActivatedAt  !== undefined) update.planActivatedAt  = planActivatedAt ? new Date(planActivatedAt) : null;
    if (maxOrders        !== undefined) update.maxOrders        = maxOrders ?? null;

    const tenant = await Tenant.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });
    res.json({ success: true, tenant });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/tenants/:id/toggle — activate/deactivate
router.patch('/:id/toggle', async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });
    tenant.isActive = !tenant.isActive;
    await tenant.save();

    // Also toggle all tenant users
    await User.updateMany({ tenantId: tenant._id }, { isActive: tenant.isActive });
    res.json({ success: true, tenant });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/tenants/:id/create-admin — create super_admin user for a tenant
router.post('/:id/create-admin', async (req, res) => {
  try {
    const { username, name, password, email } = req.body;
    if (!username || !name || !password) {
      return res.status(400).json({ success: false, message: 'username, name and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });

    const existing = await User.findOne({ username: username.trim().toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Username already taken' });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username:  username.trim().toLowerCase(),
      name:      name.trim(),
      email:     email ? email.trim().toLowerCase() : undefined,
      password:  hash,
      role:      'super_admin',
      tenantId:  tenant._id,
    });

    const populated = await User.findById(user._id, '-password').lean();
    res.status(201).json({ success: true, user: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── User management under a tenant (platform owner only) ──────────────────────

// GET /api/tenants/:id/users
router.get('/:id/users', async (req, res) => {
  try {
    const users = await User.find({ tenantId: req.params.id }, '-password')
      .populate('assignedOutlets', '_id name city')
      .sort({ createdAt: 1 })
      .lean();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/tenants/:id/users — create any role user for the tenant
router.post('/:id/users', async (req, res) => {
  try {
    const { username, name, email, password, role } = req.body;
    if (!username || !name || !password) {
      return res.status(400).json({ success: false, message: 'username, name and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    if (role === 'platform_owner') {
      return res.status(403).json({ success: false, message: 'Cannot assign platform_owner role' });
    }

    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });

    const existing = await User.findOne({ username: username.trim().toLowerCase() });
    if (existing) return res.status(409).json({ success: false, message: 'Username already taken' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: username.trim().toLowerCase(),
      name:     name.trim(),
      email:    email ? email.trim().toLowerCase() : undefined,
      password: hash,
      role:     role || 'staff',
      tenantId: tenant._id,
    });

    const populated = await User.findById(user._id, '-password')
      .populate('assignedOutlets', '_id name city').lean();
    res.status(201).json({ success: true, user: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/tenants/:id/users/:uid — update name / role / email / isActive
router.put('/:id/users/:uid', async (req, res) => {
  try {
    const { name, role, email, isActive } = req.body;
    if (role === 'platform_owner') {
      return res.status(403).json({ success: false, message: 'Cannot assign platform_owner role' });
    }
    const update = {};
    if (name     !== undefined) update.name     = name.trim();
    if (role     !== undefined) update.role     = role;
    if (email    !== undefined) update.email    = email ? email.trim().toLowerCase() : undefined;
    if (isActive !== undefined) update.isActive = isActive;

    const user = await User.findOneAndUpdate(
      { _id: req.params.uid, tenantId: req.params.id },
      update,
      { new: true, runValidators: true }
    ).select('-password').populate('assignedOutlets', '_id name city');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/tenants/:id/users/:uid/reset-password
router.post('/:id/users/:uid/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    const user = await User.findOneAndUpdate(
      { _id: req.params.uid, tenantId: req.params.id },
      { password: hash }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/tenants/:id/users/:uid
router.delete('/:id/users/:uid', async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ _id: req.params.uid, tenantId: req.params.id });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/tenants/:id — delete only if no orders
router.delete('/:id', async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });

    const orderCount = await Order.countDocuments({ tenantId: tenant._id });
    if (orderCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete tenant with ${orderCount} order(s). Deactivate instead.`,
      });
    }

    await Promise.all([
      User.deleteMany({ tenantId: tenant._id }),
      Tenant.findByIdAndDelete(req.params.id),
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

async function seedTenantDefaults(tenantId) {
  const AppSettings = require('../models/AppSettings');
  const DEFAULTS = [
    { key: 'cake_flavors',    label: 'Cake Flavors',         values: ['Chocolate', 'Vanilla', 'Red Velvet', 'Butterscotch', 'Strawberry', 'Black Forest', 'Mango', 'Pineapple'] },
    { key: 'cake_sizes',      label: 'Cake Sizes / Weights', values: ['0.5 kg', '1 kg', '1.5 kg', '2 kg', '2.5 kg', '3 kg', '4 kg', '5 kg'] },
    { key: 'delivery_cities', label: 'Delivery Cities',      values: ['City 1', 'City 2', 'Other'] },
    { key: 'flower_types',    label: 'Flower Types',         values: ['Red Roses', 'Mixed Flowers', 'Sunflowers', 'Lilies', 'Orchids'] },
    { key: 'gift_types',      label: 'Gift Types',           values: ['Teddy Bear', 'Photo Frame', 'Mug', 'Cushion', 'Jewelry'] },
  ];
  for (const def of DEFAULTS) {
    await AppSettings.findOneAndUpdate(
      { key: def.key, tenantId },
      { $setOnInsert: { label: def.label, values: def.values, tenantId } },
      { upsert: true },
    );
  }
}

module.exports = router;
module.exports.seedTenantDefaults = seedTenantDefaults;
