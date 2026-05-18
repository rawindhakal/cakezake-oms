require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const http        = require('http');
const express     = require('express');
const compression = require('compression');
const helmet      = require('helmet');
const cors        = require('cors');
const morgan      = require('morgan');
const path        = require('path');
const session     = require('express-session');
const MongoStore  = require('connect-mongo');
const bcrypt      = require('bcrypt');
const connectDB   = require('./config/db');
const socketInit  = require('./socket');

const authRoutes        = require('./routes/auth');
const orderRoutes       = require('./routes/orders');
const statsRoutes       = require('./routes/stats');
const uploadRoutes      = require('./routes/upload');
const outletRoutes      = require('./routes/outlets');
const customerRoutes    = require('./routes/customers');
const appSettingsRoutes = require('./routes/appSettings');
const userRoutes        = require('./routes/users');
const trackRoutes       = require('./routes/track');
const socialRoutes      = require('./routes/social');
const emailConfigRoutes = require('./routes/emailConfig');
const smsConfigRoutes   = require('./routes/smsConfig');
const tenantRoutes      = require('./routes/tenants');
const activityRoutes    = require('./routes/activity');

const app = express();

connectDB();

app.set('trust proxy', 1);
app.use(compression());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc:    ["'self'", "'unsafe-inline'"],
      imgSrc:      ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
      connectSrc:  ["'self'", 'wss:', 'ws:'],
      fontSrc:     ["'self'", 'data:'],
      objectSrc:   ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '50mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(session({
  secret: process.env.SESSION_SECRET || 'cakezake-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 8 * 60 * 60,
    touchAfter: 3600,
  }),
  cookie: {
    httpOnly: true,
    secure:   process.env.HTTPS === 'true',
    sameSite: process.env.HTTPS === 'true' ? 'strict' : 'lax',
    maxAge:   parseInt(process.env.SESSION_MAX_AGE) || 28800000,
  },
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth',         authRoutes);
app.use('/api/orders',       orderRoutes);
app.use('/api/stats',        statsRoutes);
app.use('/api/upload',       uploadRoutes);
app.use('/api/outlets',      outletRoutes);
app.use('/api/customers',    customerRoutes);
app.use('/api/app-settings', appSettingsRoutes);
app.use('/api/users',        userRoutes);
app.use('/api/track',        trackRoutes);
app.use('/api/social',       socialRoutes);
app.use('/api/email-config', emailConfigRoutes);
app.use('/api/sms-config',   smsConfigRoutes);
app.use('/api/tenants',      tenantRoutes);
app.use('/api/activity',     activityRoutes);

if (process.env.NODE_ENV === 'production') {
  const clientBuild = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientBuild, {
    setHeaders(res, filePath) {
      const base = path.basename(filePath);
      if (base === 'index.html' || base === 'sw.js' || base.startsWith('workbox-')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return;
      }
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

async function seedPlatformOwner() {
  try {
    const User        = require('./models/User');
    const Tenant      = require('./models/Tenant');
    const Order       = require('./models/Order');
    const Outlet      = require('./models/Outlet');
    const Payment     = require('./models/Payment');
    const AppSettings = require('./models/AppSettings');
    const Counter     = require('./models/Counter');
    const EmailConfig = require('./models/EmailConfig');
    const SmsConfig   = require('./models/SmsConfig');

    // ── 1. Platform owner — driven entirely by env vars ─────────────────────────
    const ownerEmail    = process.env.PLATFORM_OWNER_EMAIL;
    const ownerPassword = process.env.PLATFORM_OWNER_PASSWORD;
    const ownerUsername = process.env.PLATFORM_OWNER_USERNAME;
    const ownerName     = process.env.PLATFORM_OWNER_NAME || 'Platform Admin';

    if (!ownerEmail || !ownerPassword || !ownerUsername) {
      console.warn('⚠️  PLATFORM_OWNER_EMAIL / _PASSWORD / _USERNAME not set — skipping platform owner seed.');
      console.warn('   Set all three in .env to auto-create the platform owner on first start.');
    } else {
      let owner = await User.findOne({ role: 'platform_owner' });
      if (!owner) {
        const hash = await bcrypt.hash(ownerPassword, 10);
        owner = await User.create({
          username: ownerUsername.toLowerCase().replace(/\s+/g, ''),
          name:     ownerName,
          email:    ownerEmail.toLowerCase(),
          password: hash,
          role:     'platform_owner',
        });
        console.log(`✅ Platform owner created → ${owner.email} (login: ${owner.username})`);
      }
    }

    // ── 2. Ensure the default CakeZake tenant exists (find-or-create by slug) ───
    const defaultSlug = process.env.DEFAULT_TENANT_SLUG || 'cakezake';
    let defaultTenant = await Tenant.findOne({ slug: defaultSlug });
    if (!defaultTenant) {
      defaultTenant = await Tenant.create({
        name:            process.env.DEFAULT_TENANT_NAME || 'CakeZake',
        slug:            defaultSlug,
        ownerName:       ownerName,
        ownerEmail:      ownerEmail || '',
        city:            process.env.DEFAULT_TENANT_CITY || 'Birtamode',
        country:         process.env.DEFAULT_TENANT_COUNTRY || 'Nepal',
        currency:        process.env.DEFAULT_TENANT_CURRENCY || 'NPR',
        orderPrefix:     process.env.DEFAULT_TENANT_PREFIX || 'CZ',
        plan:            'pro',
        isActive:        true,
        planActivatedAt: new Date(),
      });
      console.log(`✅ Default tenant created: ${defaultTenant.name} (${defaultTenant._id})`);
    }

    // ── 3. Migrate ALL unscoped documents → default tenant (idempotent) ─────────
    const UNSCOPED = { tenantId: { $exists: false } };
    const SET_TID  = { $set: { tenantId: defaultTenant._id } };
    const [o, out, p, a, c, ec, sc] = await Promise.all([
      Order.updateMany(       UNSCOPED, SET_TID),
      Outlet.updateMany(      UNSCOPED, SET_TID),
      Payment.updateMany(     UNSCOPED, SET_TID),
      AppSettings.updateMany( UNSCOPED, SET_TID),
      Counter.updateMany(     UNSCOPED, SET_TID),
      EmailConfig.updateMany( UNSCOPED, SET_TID),
      SmsConfig.updateMany(   UNSCOPED, SET_TID),
    ]);
    const total = o.modifiedCount + out.modifiedCount + p.modifiedCount +
                  a.modifiedCount + c.modifiedCount + ec.modifiedCount + sc.modifiedCount;
    if (total > 0) {
      console.log(`✅ Migrated unscoped data → orders:${o.modifiedCount} outlets:${out.modifiedCount} payments:${p.modifiedCount}`);
    }

    // ── 4. Migrate unscoped staff users ─────────────────────────────────────────
    const migratedUsers = await User.updateMany(
      { role: { $in: ['super_admin', 'staff', 'order_processor', 'rider'] }, tenantId: { $exists: false } },
      SET_TID
    );
    if (migratedUsers.modifiedCount > 0) {
      console.log(`✅ Assigned ${migratedUsers.modifiedCount} unscoped users → ${defaultTenant.name}`);
    }

    // ── 5. Create default tenant admin if none exists yet ───────────────────────
    const adminExists = await User.findOne({ role: 'super_admin', tenantId: defaultTenant._id });
    if (!adminExists) {
      const adminPw = process.env.DEFAULT_ADMIN_PASSWORD || 'cakezake@123';
      const hash    = await bcrypt.hash(adminPw, 10);
      const adminUsername = process.env.DEFAULT_ADMIN_USERNAME || defaultSlug;
      await User.create({
        username: adminUsername,
        name:     `${defaultTenant.name} Admin`,
        password: hash,
        role:     'super_admin',
        tenantId: defaultTenant._id,
      });
      console.log(`✅ Tenant admin created → username: ${adminUsername}`);
    }

    // ── 6. Seed default app settings ────────────────────────────────────────────
    const { seedTenantDefaults } = require('./routes/tenants');
    await seedTenantDefaults(defaultTenant._id);

  } catch (err) {
    console.error('Seed error:', err.message);
  }
}

const httpServer = http.createServer(app);
socketInit.init(httpServer);

httpServer.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await seedPlatformOwner();
});
