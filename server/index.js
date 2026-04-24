require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const http        = require('http');
const express     = require('express');
const compression = require('compression');
const helmet  = require('helmet');
const cors    = require('cors');
const morgan  = require('morgan');
const path    = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt  = require('bcrypt');
const connectDB = require('./config/db');
const socketInit = require('./socket');

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

const app = express();

connectDB();

app.set('trust proxy', 1);
app.use(compression());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc:       ["'self'", "'unsafe-inline'"],
      imgSrc:         ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
      connectSrc:     ["'self'", 'wss:', 'ws:'],
      fontSrc:        ["'self'", 'data:'],
      objectSrc:      ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
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
    ttl: 8 * 60 * 60,        // 8h — auto-removes expired sessions from DB
    touchAfter: 3600,         // only update session in DB once per hour (reduces writes)
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

if (process.env.NODE_ENV === 'production') {
  const clientBuild = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientBuild));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

async function seedSuperAdmin() {
  try {
    const User  = require('./models/User');
    const count = await User.countDocuments();
    if (count === 0) {
      const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'cakezake@123';
      const hash = await bcrypt.hash(defaultPassword, 10);
      await User.create({ username: 'admin', name: 'Super Admin', password: hash, role: 'super_admin' });
      console.log(`✅ Default super admin created → username: admin  password: ${defaultPassword}`);
    }
  } catch (err) {
    console.error('Seed error:', err.message);
  }
}

const httpServer = http.createServer(app);
socketInit.init(httpServer);

httpServer.listen(PORT, async () => {
  console.log(`🎂 CakeZake server running on port ${PORT}`);
  await seedSuperAdmin();
});
