const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const { sendOTP } = require('../emailService');

const router = express.Router();

router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, phone, role } = req.body;
    
    let targetEmail = email;
    if (!targetEmail) {
      if (!phone) {
        return res.status(400).json({ error: 'Email or phone number is required' });
      }
      const cleanPhone = phone.replace(/\+/g, '');
      targetEmail = `${cleanPhone}@hydrentals.local`;
    }

    // Check if email or phone is registered
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
    insert.run(id, targetEmail, hash, name, phone, role || 'tenant', otp);

    console.log(`🔑 [DEV MODE OTP] Verification Code for ${targetEmail} / ${phone || 'N/A'} is: ${otp}`);

    // Physically Send Live OTP Email if not dummy
    if (!targetEmail.endsWith('@hydrentals.local')) {
      await sendOTP(targetEmail, otp);
    }

    res.json({ 
      session: null, 
      user: { id, email: targetEmail, full_name: name, role: role || 'tenant', is_verified: false },
      dev_otp: otp
    });
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

    // PDF Spec: Deny access until explicit Email Verification
    if (!user.is_verified) {
      return res.status(401).json({ error: 'Verification required. Please verify your account before logging in.' });
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

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    db.prepare('UPDATE users SET verification_token = ? WHERE id = ?').run(otp, user.id);

    console.log(`🔑 [DEV MODE OTP] Login OTP for ${user.email} / ${user.phone || 'N/A'} is: ${otp}`);

    if (user.email && !user.email.endsWith('@hydrentals.local')) {
      await sendOTP(user.email, otp);
    }

    res.json({ 
      success: true, 
      message: 'OTP sent successfully',
      dev_otp: otp
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error sending login OTP' });
  }
});

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

    // Verify user and clear OTP token
    db.prepare('UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?').run(user.id);

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error verifying OTP' });
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

router.post('/forgot-password', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = db.prepare('SELECT id, email, full_name, role, is_verified, avatar_url FROM users WHERE email = ?').get(email);
    if (!user) return res.status(404).json({ error: 'User not found with this email' });

    // Generate a temporary JWT token that acts as reset authorization
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || JWT_SECRET || 'test_jwt_secret', { expiresIn: '15m' });

    console.log(`🔑 [DEV MODE] Password Reset requested for ${email}. Access token generated.`);

    res.json({ success: true, token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reset-password', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(password_hash, req.user.id);
    const user = db.prepare('SELECT id, email, full_name, phone, role, is_verified, avatar_url FROM users WHERE id = ?').get(req.user.id);

    console.log(`🔑 [DEV MODE] Password successfully updated/reset for ${user.email}`);

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
