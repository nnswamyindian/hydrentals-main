const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { sendPropertyActivationSuccessEmail } = require('../emailService');

const router = express.Router();

// 1. Production Webhook Endpoint - processes Razorpay status callbacks
// Uses raw express body parsing for HMAC-SHA256 signature validation
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('❌ Webhook secret is not configured in the environment.');
    return res.status(500).send('Webhook secret missing');
  }

  const signature = req.headers['x-razorpay-signature'];
  if (!signature) {
    console.error('❌ Webhook signature missing in headers.');
    return res.status(400).send('Signature missing');
  }

  const rawBody = req.body.toString();

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('❌ Webhook signature verification failed!');
      return res.status(400).send('Signature verification failed');
    }
  } catch (err) {
    console.error('❌ Error verifying webhook signature:', err.message);
    return res.status(500).send('Verification error');
  }

  // Parse webhook payload
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error('❌ JSON parse error on webhook raw body:', err.message);
    return res.status(400).send('Invalid JSON');
  }

  const event = payload.event;
  console.log(`[Razorpay Webhook] Verified event: ${event}`);

  // Retrieve payment entity parameters depending on event format
  let paymentEntity = null;
  let orderId = '';
  let paymentId = '';
  let paymentMethod = '';

  if (event === 'payment_link.paid') {
    const plink = payload.payload.payment_link?.entity;
    const payment = payload.payload.payment?.entity;
    if (plink && payment) {
      orderId = plink.order_id || plink.id;
      paymentId = payment.id;
      paymentMethod = payment.method || 'upi';
      paymentEntity = payment;
    }
  } else if (payload.payload.payment) {
    const payment = payload.payload.payment.entity;
    orderId = payment.order_id;
    paymentId = payment.id;
    paymentMethod = payment.method || 'card';
    paymentEntity = payment;
  }

  if (!orderId && paymentEntity) {
    orderId = paymentEntity.order_id || '';
  }

  if (!orderId && event !== 'payment_link.paid') {
    console.warn(`[Webhook] No order ID associated with event: ${event}`);
  }

  try {
    db.transaction(() => {
      // Find matching payment record
      let paymentRecord = null;
      if (orderId) {[paymentRecord_rows] = await db.execute(`
          SELECT id, property_id, user_id, status FROM payments 
          WHERE razorpay_order_id = ? OR payment_link LIKE ?
        `, [orderId, `%${orderId}%`]);
    paymentRecord = paymentRecord = paymentRecord_rows[0];
      }

      if (!paymentRecord && paymentId) {
        // Fallback match on transaction/payment ID[paymentRecord_rows] = await db.execute(`
          SELECT id, property_id, user_id, status FROM payments 
          WHERE razorpay_payment_id = ?
        `, [paymentId]);
    paymentRecord = paymentRecord = paymentRecord_rows[0];
      }

      if (!paymentRecord) {
        console.warn(`[Webhook] No matching payment record found in database for order_id: ${orderId}, payment_id: ${paymentId}`);
        return;
      }

      // Handle specific events
      if (event === 'payment.captured' || event === 'payment_link.paid') {
        if (paymentRecord.status === 'completed') {
          console.log(`[Webhook] Payment ${paymentRecord.id} is already completed. Skipping update to prevent duplicates.`);
          return;
        }

        // Update payment record to completed
        await db.execute(`
          UPDATE payments 
          SET status = 'completed', 
              payment_method = ?, 
              transaction_id = ?,
              razorpay_payment_id = ?,
              paid_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `, [paymentMethod, paymentId, paymentId, paymentRecord.id]);

        // Update property record to approved
        await db.execute(`
          UPDATE properties 
          SET status = 'approved', 
              is_verified = 1 
          WHERE id = ?
        `, [paymentRecord.property_id]);

        // Insert owner in-app notification
        const notifId = crypto.randomUUID();
        await db.execute(`
          INSERT INTO notifications (id, user_id, title, body, link) 
          VALUES (?, ?, ?, ?, ?)
        `, [
          notifId, 
          paymentRecord.user_id, 
          'Property Listing Live! 🚀', 
          'Your property listing has been approved and published successfully.', 
          '/my-properties'
        ]);

        // Send activation confirmation email
        const [owner_rows] = await db.execute('SELECT email, full_name FROM users WHERE id = ?', [paymentRecord.user_id]);
    const owner = owner_rows[0];
        const [property_rows] = await db.execute('SELECT title FROM properties WHERE id = ?', [paymentRecord.property_id]);
    const property = property_rows[0];

        if (owner && property) {
          sendPropertyActivationSuccessEmail(owner.email, owner.full_name || 'Property Owner', property.title);
        }

        console.log(`[Webhook] Successfully processed payment and activated property ID: ${paymentRecord.property_id}`);

      } else if (event === 'payment.authorized') {
        if (paymentRecord.status === 'completed') return;
        
        // Update payment record to authorized/processing
        await db.execute("UPDATE payments SET status = 'processing' WHERE id = ?", [paymentRecord.id]);
        console.log(`[Webhook] Payment ${paymentRecord.id} authorized.`);

      } else if (event === 'payment.failed') {
        if (paymentRecord.status === 'completed') return;

        // Update payment record to failed
        await db.execute("UPDATE payments SET status = 'failed' WHERE id = ?", [paymentRecord.id]);
        console.log(`[Webhook] Payment ${paymentRecord.id} marked as failed.`);
        
        // Notify owner
        const notifId = crypto.randomUUID();
        await db.execute(`
          INSERT INTO notifications (id, user_id, title, body, link) 
          VALUES (?, ?, ?, ?, ?)
        `, [
          notifId,
          paymentRecord.user_id,
          'Property Listing Payment Failed ❌',
          'The listing activation payment failed. Please try again from your dashboard.',
          '/dashboard'
        ]);
      }
    })();
  } catch (dbErr) {
    console.error('❌ Database error handling webhook transaction:', dbErr.message);
    return res.status(500).send('Database transaction failed');
  }

  res.status(200).json({ status: 'ok' });
});

module.exports = router;
