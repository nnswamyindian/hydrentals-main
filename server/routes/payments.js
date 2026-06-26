const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { sendPropertyActivationSuccessEmail } = require('../emailService');

const router = express.Router();

const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error('CRITICAL: Razorpay API keys are not configured in the environment.');
  }
  return new Razorpay({ key_id, key_secret });
};

// POST /api/payments/create-order - Creates a live order on Razorpay for a property listing
router.post('/create-order', authenticateToken, async (req, res) => {
  const { propertyId } = req.body;
  const { id: userId } = req.user;

  if (!propertyId) {
    return res.status(400).json({ error: 'Property ID is required' });
  }

  try {
    // 1. Validate property exists
    const property = db.prepare('SELECT id, owner_id, title, rent, status FROM properties WHERE id = ?').get(propertyId);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // 2. Validate user owns property
    if (property.owner_id !== userId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this property' });
    }

    // 3. Validate payment not already completed
    const existingPayment = db.prepare('SELECT id, status, amount FROM payments WHERE property_id = ?').get(propertyId);
    if (existingPayment && existingPayment.status === 'completed') {
      return res.status(400).json({ error: 'Payment is already completed for this property listing' });
    }

    // 4. Validate amount is ₹500 (standard fee)
    const amount = 500; // Rs
    const amountPaise = amount * 100; // 50000 paise

    // Create Razorpay Order
    let razorpay;
    try {
      razorpay = getRazorpayInstance();
    } catch (keyErr) {
      return res.status(500).json({ error: keyErr.message });
    }

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `receipt_${propertyId.substring(0, 15)}`,
      notes: {
        property_id: propertyId,
        user_id: userId
      }
    });

    const orderId = order.id;

    // 5. Store / update in payments table
    if (existingPayment) {
      db.prepare('UPDATE payments SET amount = ?, status = ?, razorpay_order_id = ? WHERE property_id = ?')
        .run(amount, 'pending', orderId, propertyId);
    } else {
      const paymentId = crypto.randomUUID();
      db.prepare('INSERT INTO payments (id, user_id, property_id, amount, status, payment_type, razorpay_order_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(paymentId, userId, propertyId, amount, 'pending', 'listing_fee', orderId);
    }

    res.json({
      order_id: orderId,
      amount: amountPaise,
      currency: 'INR',
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error('Error creating Razorpay Order:', err.message);
    res.status(500).json({ error: err.message || 'Server error creating Razorpay order' });
  }
});

// POST /api/payments/verify - Validates Razorpay checkout signature and publishes the listing
router.post('/verify', authenticateToken, (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, propertyId } = req.body;
  const { id: userId } = req.user;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !propertyId) {
    return res.status(400).json({ error: 'Missing required payment verification parameters' });
  }

  try {
    // 1. Verify Signature
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'Razorpay secret is not configured' });
    }

    const payload = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('❌ Razorpay signature verification failed!');
      return res.status(400).json({ error: 'Invalid signature verification failed' });
    }

    let success = false;
    db.transaction(() => {
      // 2. Fetch payment record
      const paymentRecord = db.prepare('SELECT id, status, user_id FROM payments WHERE property_id = ?').get(propertyId);
      if (!paymentRecord) {
        throw new Error('No payment record found for this property');
      }

      if (paymentRecord.status === 'completed') {
        success = true;
        return;
      }

      // 3. Update payment status
      db.prepare(`
        UPDATE payments 
        SET status = 'completed', 
            payment_method = 'online', 
            transaction_id = ?, 
            razorpay_payment_id = ?, 
            razorpay_signature = ?, 
            paid_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(razorpay_payment_id, razorpay_payment_id, razorpay_signature, paymentRecord.id);

      // 4. Update property status
      db.prepare("UPDATE properties SET status = 'approved', is_verified = 1 WHERE id = ?").run(propertyId);

      // 5. Create in-app notification
      const notifId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, body, link) 
        VALUES (?, ?, ?, ?, ?)
      `).run(
        notifId, 
        paymentRecord.user_id, 
        'Property Listing Live! 🚀', 
        'Your payment of ₹500 was completed and verified. Your property listing is now published.', 
        '/my-properties'
      );

      success = true;
    })();

    if (success) {
      // 6. Send confirmation email
      try {
        const owner = db.prepare('SELECT email, full_name FROM users WHERE id = ?').get(userId);
        const property = db.prepare('SELECT title FROM properties WHERE id = ?').get(propertyId);
        if (owner && property) {
          sendPropertyActivationSuccessEmail(owner.email, owner.full_name || 'Property Owner', property.title);
        }
      } catch (emailErr) {
        console.error('Failed to send property activation success email:', emailErr.message);
      }

      return res.json({ success: true, message: 'Payment verified and listing is now published' });
    }
  } catch (err) {
    console.error('Error during signature verification:', err.message);
    res.status(500).json({ error: err.message || 'Signature verification database update failed' });
  }
});

module.exports = router;
