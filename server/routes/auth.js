const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const { sendOTP } = require('../emailService'); // Added this line

const router = express.Router();

router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, phone, role } = req.body;
    
    // Check if user exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Generate random UUID
    const id = crypto.randomUUID();
    const hash = await bcrypt.hash(password, 10);
    
    // Generate 6-digit OTP mapping
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Insert user
    const insert = db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, phone, role, verification_token) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    // SQLite enforces defaults: is_verified = 0
    insert.run(id, email, hash, name, phone, role || 'tenant', otp);

    // Physically Send Live OTP Email
    await sendOTP(email, otp);

    // Natively emulate Supabase Confirmed Email requirement: return user but NULL session
    res.json({ session: null, user: { id, email, full_name: name, role: role || 'tenant', is_verified: false } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

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
    
    const insert = db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, phone, role, is_verified) 
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);
    
    insert.run(id, email, hash, name, phone, role || 'tenant');

    res.json({ user: { id, email, full_name: name, role: role || 'tenant', is_verified: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during admin user creation' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid login credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid login credentials' });
    }

    // PDF Spec: Deny access until explicit Email Verification
    if (!user.is_verified) {
      return res.status(401).json({ error: 'Email verification required. Please check your inbox before logging in.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND verification_token = ?').get(email, otp);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid OTP code. Please try again.' });
    }

    // Verify user and clear OTP buffer
    db.prepare('UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?').run(user.id);
    
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      token,
      session: { access_token: token, user: { id: user.id, email: user.email, role: user.role } },
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during OTP verification' });
  }
});

router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, email, full_name, phone, role, is_verified, avatar_url FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/me/avatar', authenticateToken, (req, res) => {
  try {
    const { avatar_url } = req.body;
    if (!avatar_url) return res.status(400).json({ error: 'avatar_url is required' });
    db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatar_url, req.user.id);
    const user = db.prepare('SELECT id, email, full_name, phone, role, is_verified, avatar_url FROM users WHERE id = ?').get(req.user.id);
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/me/profile', authenticateToken, (req, res) => {
  try {
    const { full_name, phone } = req.body;
    db.prepare('UPDATE users SET full_name = ?, phone = ? WHERE id = ?').run(full_name || null, phone || null, req.user.id);
    const user = db.prepare('SELECT id, email, full_name, phone, role, is_verified, avatar_url FROM users WHERE id = ?').get(req.user.id);
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
