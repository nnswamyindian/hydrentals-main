const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sendPropertySubmissionEmails } = require('../emailService');

const router = express.Router();

// Configure multer: max 5 MB per image, JPEG/PNG/WebP only
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, and WebP images are allowed.'));
    }
    cb(null, true);
  },
});

router.get('/', async (req, res) => {
  try {
    const {
      status = 'approved',
      listingType,
      locality,
      types,
      furnished,
      gender,
      pets,
      food,
      search,
      minRent,
      maxRent,
      page = 0,
      limit = 20
    } = req.query;

    // Convert object params to array for MySQL OR reformat to parameterized
    // Since original used named parameters like @status which better-sqlite3 supports but mysql2 prepare might not support natively without namedPlaceholders=true config (which we didn't add), 
    // wait I should rewrite it to avoid named params if possible, but actually we can just pass them as an object if we configured namedPlaceholders. But the current query uses @status. Let's rewrite it quickly with ? placeholders.
    let query2 = `
      SELECT p.*,
             u.full_name as owner_name, 
             u.phone as owner_phone,
             u.is_verified as owner_verified
      FROM properties p
      JOIN users u ON p.owner_id = u.id
      WHERE p.status = ?
    `;
    const paramsList = [status];

    if (listingType && listingType !== 'all') {
      query2 += ' AND p.listing_type = ?';
      paramsList.push(listingType);
    }
    if (locality) {
      query2 += ' AND p.locality = ?';
      paramsList.push(locality);
    }
    if (types) {
      const typesArr = types.split(',');
      query2 += ` AND p.property_type IN (${typesArr.map(() => '?').join(',')})`;
      paramsList.push(...typesArr);
    }
    if (furnished) {
      const furnArr = furnished.split(',');
      query2 += ` AND p.furnished_status IN (${furnArr.map(() => '?').join(',')})`;
      paramsList.push(...furnArr);
    }
    if (gender && gender !== 'any') {
      query2 += " AND p.gender_preference IN (?, 'any')";
      paramsList.push(gender);
    }
    if (pets === 'true') query2 += ' AND p.pets_allowed = 1';
    if (food === 'true') query2 += ' AND p.food_available = 1';

    if (search) {
      query2 += ' AND (p.title LIKE ? OR p.locality LIKE ? OR p.description LIKE ?)';
      paramsList.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (minRent) {
      query2 += ' AND p.rent >= ?';
      paramsList.push(Number(minRent));
    }
    if (maxRent) {
      query2 += ' AND p.rent <= ?';
      paramsList.push(Number(maxRent));
    }

    query2 += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    paramsList.push(Number(limit), Number(page) * Number(limit));

    const [rawProperties] = await db.execute(query2, paramsList);

    // Parse JSON fields
    const properties = rawProperties.map(p => ({
      ...p,
      amenities: p.amenities ? JSON.parse(p.amenities) : [],
      images: p.images ? JSON.parse(p.images) : [],
      unavailable_dates: p.unavailable_dates ? JSON.parse(p.unavailable_dates) : [],
      food_available: Boolean(p.food_available),
      pets_allowed: Boolean(p.pets_allowed),
      is_verified: Boolean(p.is_verified),
      is_direct_owner: Boolean(p.is_direct_owner),
      ownerVerified: Boolean(p.owner_verified),
      ownerId: p.owner_id,
      ownerName: p.owner_name,
      propertyType: p.property_type,
      roomType: p.room_type,
      listingType: p.listing_type,
      salePrice: p.sale_price,
      furnishedStatus: p.furnished_status,
      genderPreference: p.gender_preference,
      availableFrom: p.available_from,
      createdAt: p.created_at
    }));

    res.json(properties);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching properties' });
  }
});

// Create property natively enforcing PDF-spec Data Boundaries
router.post('/', authenticateToken, upload.array('images', 10), async (req, res) => {
  try {
    const { role, id: owner_id } = req.user;
    if (role !== 'owner' && role !== 'admin' && role !== 'subadmin') {
      return res.status(403).json({ error: 'Only owners, admins, or subadmins can list properties' });
    }

    const {
      title, description, listingType, propertyType, roomType, rent, deposit, maintenance,
      salePrice, locality, address, pincode, furnishedStatus, genderPreference,
      availableFrom, latitude, longitude, isDirectOwner
    } = req.body;

    // Strict PDF Boundary Validation Gates
    if (!title || title.length < 10 || title.length > 200) return res.status(400).json({ error: 'Title violates length bounds (10-200 chars)' });
    if (description && description.length > 5000) return res.status(400).json({ error: 'Maximum description threshold (5,000) exceeded' });
    if (!pincode || !/^\d{6}$/.test(pincode)) return res.status(400).json({ error: 'Invalid Pincode geography. Exactly 6 Indian digits required.' });
    if (rent && (Number(rent) < 1 || Number(rent) > 10000000)) return res.status(400).json({ error: 'Gross rental limits (1 to 10M) violated.' });
    if (deposit && (Number(deposit) < 0 || Number(deposit) > 50000000)) return res.status(400).json({ error: 'Deposit boundaries (up to 50M) exceeded.' });
    if (listingType === 'sale' && (!salePrice || Number(salePrice) < 1 || Number(salePrice) > 500000000)) return res.status(400).json({ error: 'Sale configurations demand valid localized price caps (<50Cr).' });

    const amenities = req.body.amenities || '[]';
    try {
      if (JSON.parse(amenities).length > 20) return res.status(400).json({ error: 'Exceeded max allowance of 20 categorized amenities' });
    } catch (e) { }

    const unavailableDates = req.body.unavailableDates || '[]';
    const foodAvailable = req.body.foodAvailable === 'true' ? 1 : 0;
    const petsAllowed = req.body.petsAllowed === 'true' ? 1 : 0;
    const isDirectOwnerNum = isDirectOwner === 'true' ? 1 : 0;

    const id = crypto.randomUUID();
    const images = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];

    await db.execute(`
      INSERT INTO properties (
        id, owner_id, title, description, property_type, room_type, listing_type,
        rent, sale_price, deposit, maintenance, locality, address, pincode,
        latitude, longitude, furnished_status, amenities, gender_preference,
        food_available, pets_allowed, available_from, images, is_direct_owner, status
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, 'pending'
      )
    `, [
      id, owner_id, title, description, propertyType, roomType, listingType,
      rent ? Number(rent) : null,
      salePrice ? Number(salePrice) : null,
      deposit ? Number(deposit) : null,
      maintenance ? Number(maintenance) : null,
      locality, address, pincode,
      latitude ? Number(latitude) : null,
      longitude ? Number(longitude) : null,
      furnishedStatus, amenities, genderPreference,
      foodAvailable, petsAllowed, availableFrom,
      JSON.stringify(images),
      isDirectOwnerNum
    ]);

    // Create pending payment log
    const paymentId = crypto.randomUUID();
    await db.execute('INSERT INTO payments (id, user_id, property_id, amount, status, payment_type) VALUES (?, ?, ?, ?, ?, ?)',
      [paymentId, owner_id, id, 500, 'pending', 'listing_fee']);

    // Send email notifications to owner and admin asynchronously
    try {
      const [owner_rows] = await db.execute('SELECT email, full_name FROM users WHERE id = ?', [owner_id]);
      const owner = owner_rows[0];
      if (owner) {
        // Fetch admin emails
        const [admins] = await db.execute("SELECT email FROM users WHERE role = 'admin'");
        const adminEmails = admins.map(a => a.email).filter(Boolean);
        if (adminEmails.length === 0) {
          adminEmails.push('admin@hydrentals.com'); // default fallback
        }

        // Asynchronously dispatch emails
        sendPropertySubmissionEmails(owner.email, owner.full_name || 'Property Owner', title, id, adminEmails);
      }
    } catch (emailErr) {
      console.error('Failed to trigger property submission emails:', emailErr.message);
    }

    res.json({ id, message: 'Property created successfully, awaiting approval', images });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error creating property' });
  }
});

// GET /:id/payment-details - Fetch payment info for checkout screen
router.get('/:id/payment-details', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { id: userId, role } = req.user;

  try {
    const [property_rows] = await db.execute('SELECT id, title, rent, owner_id, locality FROM properties WHERE id = ?', [id]);
    const property = property_rows[0];
    if (!property) return res.status(404).json({ error: 'Property not found' });

    // Restrict access to the property owner or administrators
    if (property.owner_id !== userId && role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Access denied to property payment details' });
    }

    const [payment_rows] = await db.execute('SELECT id, amount, status, payment_link, razorpay_order_id FROM payments WHERE property_id = ?', [id]);
    const payment = payment_rows[0];
    if (!payment) return res.status(404).json({ error: 'Payment record not found for this property' });

    const [owner_rows] = await db.execute('SELECT email, full_name, phone FROM users WHERE id = ?', [property.owner_id]);
    const owner = owner_rows[0];
    if (!owner) return res.status(404).json({ error: 'Property owner account not found' });

    res.json({
      property,
      payment,
      owner: {
        name: owner.full_name || 'Property Owner',
        email: owner.email,
        phone: owner.phone || ''
      },
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || ''
    });
  } catch (err) {
    console.error('Error fetching payment details:', err.message);
    res.status(500).json({ error: 'Server error retrieving payment details' });
  }
});

// POST /:id/manual-verify-payment - Admin override to manually verify listing payment
router.post('/:id/manual-verify-payment', authenticateToken, requireRole('admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const [property_rows] = await db.execute('SELECT title, owner_id FROM properties WHERE id = ?', [id]);
    const property = property_rows[0];
    if (!property) return res.status(404).json({ error: 'Property not found' });

    let success = false;
    try {
      // 1. Mark payment as completed
      await db.execute(`
        UPDATE payments 
        SET status = 'completed', 
            payment_method = 'manual_admin', 
            razorpay_payment_id = ?, 
            paid_at = CURRENT_TIMESTAMP 
        WHERE property_id = ?
      `, ['manual_' + crypto.randomUUID().substring(0, 8), id]);

      // 2. Approve property listing
      await db.execute("UPDATE properties SET status = 'approved', is_verified = 1 WHERE id = ?", [id]);

      // 3. Dispatch in-app notification
      const notifId = crypto.randomUUID();
      await db.execute(`
        INSERT INTO notifications (id, user_id, title, body, link) 
        VALUES (?, ?, ?, ?, ?)
      `, [
        notifId,
        property.owner_id,
        'Property Listing Published! 🚀',
        'Your listing was manually verified and published by our administrator.',
        '/my-properties'
      ]);

      success = true;
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Database transaction error' });
    }

    if (success) {
      // 4. Send confirmation email to property owner
      try {
        const [owner_rows] = await db.execute('SELECT email, full_name FROM users WHERE id = ?', [property.owner_id]);
        const owner = owner_rows[0];
        if (owner) {
          const { sendPropertyActivationSuccessEmail } = require('../emailService');
          sendPropertyActivationSuccessEmail(owner.email, owner.full_name || 'Property Owner', property.title);
        }
      } catch (emailErr) {
        console.error('Failed to trigger manual verification success email:', emailErr.message);
      }

      return res.json({ success: true, message: 'Property manually verified and published successfully' });
    }
  } catch (err) {
    console.error('Error during manual property verification:', err.message);
    res.status(500).json({ error: 'Server error during manual verification' });
  }
});

// POST /:id/resend-payment-link - Admin resends the listing fee invoice email
router.post('/:id/resend-payment-link', authenticateToken, requireRole('admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const [property_rows] = await db.execute('SELECT title, owner_id FROM properties WHERE id = ?', [id]);
    const property = property_rows[0];
    if (!property) return res.status(404).json({ error: 'Property not found' });

    const [payment_rows] = await db.execute('SELECT payment_link FROM payments WHERE property_id = ?', [id]);
    const payment = payment_rows[0];
    if (!payment || !payment.payment_link) {
      return res.status(404).json({ error: 'No active payment link found for this property listing' });
    }

    const [owner_rows] = await db.execute('SELECT email, full_name FROM users WHERE id = ?', [property.owner_id]);
    const owner = owner_rows[0];
    if (!owner) return res.status(404).json({ error: 'Property owner account not found' });

    const { sendPropertyApprovalPaymentEmail } = require('../emailService');
    sendPropertyApprovalPaymentEmail(owner.email, owner.full_name || 'Property Owner', property.title, payment.payment_link);

    res.json({ success: true, message: 'Payment link invoice resent successfully' });
  } catch (err) {
    console.error('Error resending listing payment link:', err.message);
    res.status(500).json({ error: 'Server error resending payment link email' });
  }
});

module.exports = router;
