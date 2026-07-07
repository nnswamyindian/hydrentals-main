const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const { sendOTP } = require('../emailService');

const router = express.Router();

/** Only expose dev helpers outside of production */
const IS_DEV = process.env.NODE_ENV !== 'production';

/** OTP is valid for 10 minutes */
const OTP_TTL_MS = 10 * 60 * 1000;

/**
 * Password strength: min 8 chars, at least one uppercase, one lowercase, one digit.
 * Returns true if the password passes all checks.
 */
function isStrongPassword(password) {
  if (!password || password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

const PASSWORD_STRENGTH_MSG =
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.';

/** Generate a 6-digit numeric OTP string */
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ---------------------------------------------------------------------------
// POST /api/auth/signup
// ---------------------------------------------------------------------------
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, phone, role } = req.body;

    // Derive target email (phone-only users get a synthetic @hydrentals.local address)
    let targetEmail = email;
    if (!targetEmail) {
      if (!phone) {
        return res.status(400).json({ error: 'Email or phone number is required' });
      }
      const cleanPhone = phone.replace(/\+/g, '');
      targetEmail = `${cleanPhone}@hydrentals.local`;
    }

    // Enforce password strength
    if (!isStrongPassword(password)) {
      return res.status(400).json({ error: PASSWORD_STRENGTH_MSG });
    }

    // Duplicate-check
    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(targetEmail);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email or phone number is already registered' });
    }
    if (phone) {
      const existingPhone = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
      if (existingPhone) {
        return res.status(400).json({ error: 'Phone number is already registered' });
      }
    }

    const id = crypto.randomUUID();
    const hash = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpExpiresAt = Date.now() + OTP_TTL_MS;

    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, phone, role, verification_token, otp_expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, targetEmail, hash, name || '', phone || null, role || 'tenant', otp, otpExpiresAt);

    console.log(`🔑 [DEV] Signup OTP for ${targetEmail}: ${otp} (expires in 10 min)`);

    // Send real email for non-synthetic addresses
    if (!targetEmail.endsWith('@hydrentals.local')) {
      try { await sendOTP(targetEmail, otp); } catch (e) { console.error('Email send failed:', e.message); }
    }

    res.json({
      session: null,
      user: { id, email: targetEmail, full_name: name, role: role || 'tenant', is_verified: false },
      // Only expose OTP to client in dev so devs can test without email
      ...(IS_DEV && { dev_otp: otp }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/admin-create-user  (admin only, verified by default)
// ---------------------------------------------------------------------------
router.post('/admin-create-user', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { email, password, name, phone, role } = req.body;

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const id = crypto.randomUUID();
    const hash = await bcrypt.hash(password, 10);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, phone, role, is_verified)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(id, email, hash, name, phone, role || 'tenant');

    res.json({ user: { id, email, full_name: name, role: role || 'tenant', is_verified: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during admin user creation' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/login  (password-based)
// ---------------------------------------------------------------------------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email/phone and password are required' });
    }

    let user = null;
    if (email.includes('@')) {
      user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    } else {
      user = db.prepare('SELECT * FROM users WHERE phone = ? OR email = ?').get(email, email);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid login credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid login credentials' });
    }

    if (!user.is_verified) {
      return res.status(401).json({
        error: 'Account not verified. Please complete OTP verification before logging in.',
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/send-login-otp
// ---------------------------------------------------------------------------
router.post('/send-login-otp', async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Email or phone number is required' });
    }

    let user = null;
    if (identifier.includes('@')) {
      user = db.prepare('SELECT * FROM users WHERE email = ?').get(identifier);
    } else {
      user = db.prepare('SELECT * FROM users WHERE phone = ? OR email = ?').get(identifier, identifier);
    }

    if (!user) {
      return res.status(404).json({ error: 'No account registered with this email or phone number' });
    }

    const otp = generateOtp();
    const otpExpiresAt = Date.now() + OTP_TTL_MS;

    db.prepare('UPDATE users SET verification_token = ?, otp_expires_at = ? WHERE id = ?')
      .run(otp, otpExpiresAt, user.id);

    console.log(`🔑 [DEV] Login OTP for ${user.email}: ${otp} (expires in 10 min)`);

    if (user.email && !user.email.endsWith('@hydrentals.local')) {
      try { await sendOTP(user.email, otp); } catch (e) { console.error('Email send failed:', e.message); }
    }

    res.json({
      success: true,
      message: 'OTP sent successfully',
      ...(IS_DEV && { dev_otp: otp }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error sending login OTP' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/login-with-otp
// ---------------------------------------------------------------------------
router.post('/login-with-otp', async (req, res) => {
  try {
    const { identifier, otp } = req.body;
    if (!identifier || !otp) {
      return res.status(400).json({ error: 'Identifier and OTP are required' });
    }

    let user = null;
    if (identifier.includes('@')) {
      user = db.prepare('SELECT * FROM users WHERE email = ?').get(identifier);
    } else {
      user = db.prepare('SELECT * FROM users WHERE phone = ? OR email = ?').get(identifier, identifier);
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.verification_token || user.verification_token !== otp) {
      return res.status(401).json({ error: 'Invalid OTP code. Please try again.' });
    }

    // Enforce expiry
    if (!user.otp_expires_at || Date.now() > Number(user.otp_expires_at)) {
      return res.status(401).json({ error: 'OTP has expired. Please request a new one.' });
    }

    db.prepare('UPDATE users SET is_verified = 1, verification_token = NULL, otp_expires_at = NULL WHERE id = ?')
      .run(user.id);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error verifying OTP' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/verify-otp  (signup verification)
// ---------------------------------------------------------------------------
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ? AND verification_token = ?').get(email, otp);

    if (!user) {
      return res.status(401).json({ error: 'Invalid OTP code. Please try again.' });
    }

    // Enforce expiry
    if (!user.otp_expires_at || Date.now() > Number(user.otp_expires_at)) {
      return res.status(401).json({ error: 'OTP has expired. Please sign up again or request a new OTP.' });
    }

    db.prepare('UPDATE users SET is_verified = 1, verification_token = NULL, otp_expires_at = NULL WHERE id = ?')
      .run(user.id);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      session: { access_token: token, user: { id: user.id, email: user.email, role: user.role } },
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during OTP verification' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/forgot-password  — sends OTP to registered email
// ---------------------------------------------------------------------------
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = db.prepare('SELECT id, email, full_name FROM users WHERE email = ?').get(email);

    // Always respond with success to avoid email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account with that email exists, a reset OTP has been sent.',
      });
    }

    const otp = generateOtp();
    const otpExpiresAt = Date.now() + OTP_TTL_MS;

    db.prepare('UPDATE users SET verification_token = ?, otp_expires_at = ? WHERE id = ?')
      .run(otp, otpExpiresAt, user.id);

    console.log(`🔑 [DEV] Password Reset OTP for ${email}: ${otp} (expires in 10 min)`);

    if (!email.endsWith('@hydrentals.local')) {
      try { await sendOTP(email, otp); } catch (e) { console.error('Email send failed:', e.message); }
    }

    res.json({
      success: true,
      message: 'A 6-digit reset OTP has been sent to your email address.',
      ...(IS_DEV && { dev_otp: otp }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/reset-password-otp  — verify OTP + set new password
// ---------------------------------------------------------------------------
router.post('/reset-password-otp', async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    if (!email || !otp || !password) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ error: PASSWORD_STRENGTH_MSG });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ? AND verification_token = ?').get(email, otp);

    if (!user) {
      return res.status(401).json({ error: 'Invalid OTP code. Please try again.' });
    }

    if (!user.otp_expires_at || Date.now() > Number(user.otp_expires_at)) {
      return res.status(401).json({ error: 'OTP has expired. Please request a new reset code.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    db.prepare('UPDATE users SET password_hash = ?, verification_token = NULL, otp_expires_at = NULL WHERE id = ?')
      .run(password_hash, user.id);

    console.log(`✅ Password successfully reset for ${email}`);

    // Auto-login the user after a successful reset
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during password reset' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare(
      'SELECT id, email, full_name, phone, role, is_verified, avatar_url FROM users WHERE id = ?'
    ).get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/auth/me/avatar
// ---------------------------------------------------------------------------
router.put('/me/avatar', authenticateToken, (req, res) => {
  try {
    const { avatar_url } = req.body;
    if (!avatar_url) return res.status(400).json({ error: 'avatar_url is required' });
    db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatar_url, req.user.id);
    const user = db.prepare(
      'SELECT id, email, full_name, phone, role, is_verified, avatar_url FROM users WHERE id = ?'
    ).get(req.user.id);
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/auth/me/profile
// ---------------------------------------------------------------------------
router.put('/me/profile', authenticateToken, (req, res) => {
  try {
    const { full_name, phone } = req.body;
    db.prepare('UPDATE users SET full_name = ?, phone = ? WHERE id = ?')
      .run(full_name || null, phone || null, req.user.id);
    const user = db.prepare(
      'SELECT id, email, full_name, phone, role, is_verified, avatar_url FROM users WHERE id = ?'
    ).get(req.user.id);
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
