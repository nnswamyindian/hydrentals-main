const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const db = require('./db');

const authRoutes = require('./routes/auth');
const propertiesRoutes = require('./routes/properties');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const restRoutes = require('./routes/rest');
const uploadRoutes = require('./routes/upload');
const edgeRoutes = require('./routes/edge');
const chatRoutes = require('./routes/chat');
const contactRoutes = require('./routes/contact');
const razorpayRoutes = require('./routes/razorpay');
const paymentsRoutes = require('./routes/payments');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// ─── Startup Validation ────────────────────────────────────────────────────
const REQUIRED_ENV = ['JWT_SECRET', 'SMTP_USER', 'SMTP_PASS', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'];
const missingVars = REQUIRED_ENV.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error(`\n❌ [FATAL] Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('   Add them to server/.env and restart.\n');
  process.exit(1);
}

// ─── Security Headers ──────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow /uploads images from frontend
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://checkout.razorpay.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'https://api.razorpay.com'],
      frameSrc: ['https://api.razorpay.com'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
}));

// ─── CORS ──────────────────────────────────────────────────────────────────
// Set ALLOWED_ORIGINS in server/.env as comma-separated list of allowed origins.
// Example: ALLOWED_ORIGINS=https://hydrentals.com,https://www.hydrentals.com
const cors = require('cors');
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:8080', 'http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Razorpay webhooks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`[CORS] Blocked request from: ${origin}`);
    callback(new Error(`CORS policy violation: origin ${origin} not allowed.`));
  },
  credentials: true,
}));

// Global API rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later.' }
});

// Stricter rate limiting for auth endpoints (signup/login/OTP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 authentication requests per windowMs
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

app.use('/api', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/send-login-otp', authLimiter);
app.use('/api/auth/verify-otp', authLimiter);
app.use('/api/auth/login-with-otp', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password-otp', authLimiter);

// Mount Razorpay webhook receiver before global JSON body parsing
app.use('/api/razorpay', razorpayRoutes);

app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertiesRoutes);
app.use('/api/rest', restRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/edge', edgeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/payments', paymentsRoutes);

// Root test endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SQLite Backend is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
