const express = require('express');
const http = require('http');
const crypto = require('crypto');
const db = require('./db');

// Set test environment variables
process.env.RAZORPAY_KEY_ID = 'test_key_id';
process.env.RAZORPAY_KEY_SECRET = 'test_key_secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';
process.env.JWT_SECRET = 'test_jwt_secret';

// Inject Razorpay Mock into Node require cache
const mockRazorpay = function() {
  return {
    orders: {
      create: async (data) => {
        return {
          id: 'order_test_e2e_live',
          amount: data.amount,
          currency: data.currency
        };
      }
    },
    paymentLink: {
      create: async (data) => {
        return {
          short_url: 'https://rzp.io/i/test_e2e_link',
          id: 'plink_test_e2e_live',
          order_id: 'order_test_e2e_live'
        };
      }
    }
  };
};
require('razorpay'); 
const rzpPath = require.resolve('razorpay');
require.cache[rzpPath].exports = mockRazorpay;

// Create Test Express Application
const app = express();
const authRoutes = require('./routes/auth');
const propertiesRoutes = require('./routes/properties');
const restRoutes = require('./routes/rest');
const paymentsRoutes = require('./routes/payments');
const razorpayRoutes = require('./routes/razorpay');

app.use('/api/razorpay', razorpayRoutes);
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertiesRoutes);
app.use('/api/rest', restRoutes);
app.use('/api/payments', paymentsRoutes);

const PORT = 3001;
const server = http.createServer(app);

async function runE2E() {
  console.log('\n==================================================');
  console.log('🚀 RUNNING LIVE INTEGRATION AND WEBHOOK TESTS (PORT 3001)');
  console.log('==================================================\n');

  const email = 'owner_live_verify@example.com';
  const password = 'password123';
  const name = 'Live Verify Owner';
  const phone = '+919999999990';
  const role = 'owner';

  // 1. Cleanup
  db.prepare('DELETE FROM payments WHERE user_id IN (SELECT id FROM users WHERE email = ?)').run(email);
  db.prepare('DELETE FROM properties WHERE owner_id IN (SELECT id FROM users WHERE email = ?)').run(email);
  db.prepare('DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email = ?)').run(email);
  db.prepare('DELETE FROM users WHERE email = ?').run(email);

  // 2. Signup Owner
  console.log('1️⃣ Registering Owner...');
  const signupRes = await fetch(`http://localhost:${PORT}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, phone, role })
  });
  const signupData = await signupRes.json();
  const userId = signupData.user.id;

  // 3. Get OTP and verify
  const userRow = db.prepare('SELECT verification_token FROM users WHERE id = ?').get(userId);
  const otp = userRow.verification_token;
  
  console.log(`2️⃣ Activating Owner with OTP: ${otp}...`);
  const verifyOtpRes = await fetch(`http://localhost:${PORT}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  });
  const verifyOtpData = await verifyOtpRes.json();
  const ownerToken = verifyOtpData.token;

  // 4. Submit Property
  console.log('3️⃣ Submitting property as Owner...');
  const propRes = await fetch(`http://localhost:${PORT}/api/rest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ownerToken}`
    },
    body: JSON.stringify({
      table: 'properties',
      action: 'insert',
      payload: {
        title: 'Live Verify Penthouse',
        description: 'Testing live signature verification and webhooks.',
        rent: 50000,
        locality: 'Gachibowli',
        owner_id: userId
      }
    })
  });
  const propData = await propRes.json();
  const propertyId = propData.data[0].id;

  // 5. Admin Login & Approval
  console.log('4️⃣ Admin Approval...');
  const adminLoginRes = await fetch(`http://localhost:${PORT}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'info.hydrentals@gmail.com', password: 'Royal@09870' })
  });
  const adminLoginData = await adminLoginRes.json();
  const adminToken = adminLoginData.token;

  // Intercept approval -> transitions to pending_payment, creates live link
  const approveRes = await fetch(`http://localhost:${PORT}/api/rest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      table: 'properties',
      action: 'update',
      payload: { status: 'approved' },
      modifiers: [{ type: 'eq', column: 'id', value: propertyId }]
    })
  });
  const approveData = await approveRes.json();

  const propRow = db.prepare('SELECT status FROM properties WHERE id = ?').get(propertyId);
  console.log(`   Property status after approval: "${propRow.status}" (Expected: pending_payment)`);

  // 6. Create Order API
  console.log('5️⃣ Testing POST /api/payments/create-order...');
  const orderRes = await fetch(`http://localhost:${PORT}/api/payments/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ownerToken}`
    },
    body: JSON.stringify({ propertyId })
  });
  const orderData = await orderRes.json();
  console.log(`   Returned Order ID: ${orderData.order_id} (Expected: order_test_e2e_live)`);
  console.log(`   Amount (Paise): ${orderData.amount} (Expected: 50000)`);

  // 7. Verify Signature API
  console.log('6️⃣ Testing POST /api/payments/verify...');
  const paymentId = 'pay_test_payment_signature_999';
  const signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(orderData.order_id + '|' + paymentId)
    .digest('hex');

  const verifyRes = await fetch(`http://localhost:${PORT}/api/payments/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ownerToken}`
    },
    body: JSON.stringify({
      razorpay_order_id: orderData.order_id,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      propertyId
    })
  });
  const verifyData = await verifyRes.json();
  console.log(`   Verification Response:`, verifyData);

  // Assert DB status updated
  const finalProp = db.prepare('SELECT status, is_verified FROM properties WHERE id = ?').get(propertyId);
  const finalPay = db.prepare('SELECT status, transaction_id FROM payments WHERE property_id = ?').get(propertyId);

  console.log(`   Asserting Database States:`);
  console.log(`   - Property Status: "${finalProp.status}" (Expected: approved)`);
  console.log(`   - Property is_verified: ${finalProp.is_verified} (Expected: 1)`);
  console.log(`   - Payment Status: "${finalPay.status}" (Expected: completed)`);
  console.log(`   - Transaction ID: "${finalPay.transaction_id}" (Expected: ${paymentId})`);

  const passedVerify = finalProp.status === 'approved' && finalProp.is_verified === 1 && finalPay.status === 'completed';

  // 8. Reset Property & Test Webhook
  console.log('7️⃣ Resetting states to test Webhook endpoint /api/razorpay/webhook...');
  db.prepare("UPDATE properties SET status = 'pending_payment', is_verified = 0 WHERE id = ?").run(propertyId);
  db.prepare("UPDATE payments SET status = 'pending', transaction_id = NULL, razorpay_payment_id = NULL WHERE property_id = ?").run(propertyId);

  const webhookPayload = {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_webhook_live_test_777',
          order_id: orderData.order_id,
          amount: 50000,
          currency: 'INR',
          method: 'upi'
        }
      }
    }
  };
  const payloadString = JSON.stringify(webhookPayload);
  const webhookSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(payloadString)
    .digest('hex');

  const webhookRes = await fetch(`http://localhost:${PORT}/api/razorpay/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': webhookSignature
    },
    body: payloadString
  });

  const webhookData = await webhookRes.json();
  console.log(`   Webhook Response Status: ${webhookRes.status} (Expected: 200)`);

  const webProp = db.prepare('SELECT status, is_verified FROM properties WHERE id = ?').get(propertyId);
  const webPay = db.prepare('SELECT status, transaction_id, payment_method FROM payments WHERE property_id = ?').get(propertyId);

  console.log(`   Asserting Webhook Database States:`);
  console.log(`   - Property Status: "${webProp.status}" (Expected: approved)`);
  console.log(`   - Payment Status: "${webPay.status}" (Expected: completed)`);
  console.log(`   - Payment Method: "${webPay.payment_method}" (Expected: upi)`);

  const passedWebhook = webProp.status === 'approved' && webPay.status === 'completed';

  // 9. Cleanup
  console.log('8️⃣ Cleaning up test data...');
  db.prepare('DELETE FROM payments WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM properties WHERE owner_id = ?').run(userId);
  db.prepare('DELETE FROM notifications WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);

  if (passedVerify && passedWebhook) {
    console.log('\n✅ ALL LIVE RAZORPAY INTEGRATION TESTS PASSED SUCCESSFULLY! ✅\n');
  } else {
    console.error('\n❌ SOME TESTS FAILED! Check outputs above. ❌\n');
    process.exit(1);
  }
}

server.listen(PORT, async () => {
  try {
    await runE2E();
    server.close();
  } catch (err) {
    console.error('Test Execution failed:', err);
    server.close();
    process.exit(1);
  }
});
