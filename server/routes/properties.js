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

router.get('/', (req, res) => {
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

    let query = `
      SELECT p.*,
             u.full_name as owner_name, 
             u.phone as owner_phone,
             u.is_verified as owner_verified
      FROM properties p
      JOIN users u ON p.owner_id = u.id
      WHERE p.status = @status
    `;
    const params = { status };
    
    if (listingType && listingType !== 'all') {
      query += ' AND p.listing_type = @listingType';
      params.listingType = listingType;
    }
    if (locality) {
      query += ' AND p.locality = @locality';
      params.locality = locality;
    }
    if (types) {
      const typesArr = types.split(',');
      query += ` AND p.property_type IN (${typesArr.map(t => "'" + t.replace(/'/g, "''") + "'").join(',')})`;
    }
    if (furnished) {
      const furnArr = furnished.split(',');
      query += ` AND p.furnished_status IN (${furnArr.map(f => "'" + f.replace(/'/g, "''") + "'").join(',')})`;
    }
    if (gender && gender !== 'any') {
      query += " AND p.gender_preference IN (@gender, 'any')";
      params.gender = gender;
    }
    if (pets === 'true') query += ' AND p.pets_allowed = 1';
    if (food === 'true') query += ' AND p.food_available = 1';
    
    if (search) {
      query += ' AND (p.title LIKE @search OR p.locality LIKE @search OR p.description LIKE @search)';
      params.search = `%${search}%`;
    }

    if (minRent) {
      query += ' AND p.rent >= @minRent';
      params.minRent = Number(minRent);
    }
    if (maxRent) {
      query += ' AND p.rent <= @maxRent';
      params.maxRent = Number(maxRent);
    }

    query += ' ORDER BY p.created_at DESC LIMIT @limit OFFSET @offset';
    params.limit = Number(limit);
    params.offset = Number(page) * Number(limit);

    const stmt = db.prepare(query);
    const rawProperties = stmt.all(params);

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
router.post('/', authenticateToken, upload.array('images', 10), (req, res) => {
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
    } catch(e) {}
    
    const unavailableDates = req.body.unavailableDates || '[]';
    const foodAvailable = req.body.foodAvailable === 'true' ? 1 : 0;
    const petsAllowed = req.body.petsAllowed === 'true' ? 1 : 0;
    const isDirectOwnerNum = isDirectOwner === 'true' ? 1 : 0;

    const id = crypto.randomUUID();
    const images = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];

    const insert = db.prepare(`
      INSERT INTO properties (
        id, owner_id, title, description, property_type, room_type, listing_type,
        rent, sale_price, deposit, maintenance, locality, address, pincode,
        latitude, longitude, furnished_status, amenities, gender_preference,
        food_available, pets_allowed, available_from, images, is_direct_owner, status
      ) VALUES (
        @id, @owner_id, @title, @description, @propertyType, @roomType, @listingType,
        @rent, @salePrice, @deposit, @maintenance, @locality, @address, @pincode,
        @latitude, @longitude, @furnishedStatus, @amenities, @genderPreference,
        @foodAvailable, @petsAllowed, @availableFrom, @images, @isDirectOwner, 'pending'
      )
    `);

    insert.run({
      id, owner_id, title, description, propertyType, roomType, listingType,
      rent: rent ? Number(rent) : null,
      salePrice: salePrice ? Number(salePrice) : null,
      deposit: deposit ? Number(deposit) : null,
      maintenance: maintenance ? Number(maintenance) : null,
      locality, address, pincode,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      furnishedStatus, amenities, genderPreference,
      foodAvailable, petsAllowed, availableFrom,
      images: JSON.stringify(images),
      isDirectOwner: isDirectOwnerNum
    });

    // Create pending payment log
    const paymentId = crypto.randomUUID();
    db.prepare('INSERT INTO payments (id, user_id, property_id, amount, status, payment_type) VALUES (?, ?, ?, ?, ?, ?)')
      .run(paymentId, owner_id, id, 500, 'pending', 'listing_fee');

    // Send email notifications to owner and admin asynchronously
    try {
      const owner = db.prepare('SELECT email, full_name FROM users WHERE id = ?').get(owner_id);
      if (owner) {
        // Fetch admin emails
        const admins = db.prepare("SELECT email FROM users WHERE role = 'admin'").all();
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
router.get('/:id/payment-details', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { id: userId, role } = req.user;

  try {
    const property = db.prepare('SELECT id, title, rent, owner_id, locality FROM properties WHERE id = ?').get(id);
    if (!property) return res.status(404).json({ error: 'Property not found' });

    // Restrict access to the property owner or administrators
    if (property.owner_id !== userId && role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Access denied to property payment details' });
    }

    const payment = db.prepare('SELECT id, amount, status, payment_link, razorpay_order_id FROM payments WHERE property_id = ?').get(id);
    if (!payment) return res.status(404).json({ error: 'Payment record not found for this property' });

    const owner = db.prepare('SELECT email, full_name, phone FROM users WHERE id = ?').get(property.owner_id);
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
router.post('/:id/manual-verify-payment', authenticateToken, requireRole('admin'), (req, res) => {
  const { id } = req.params;

  try {
    const property = db.prepare('SELECT title, owner_id FROM properties WHERE id = ?').get(id);
    if (!property) return res.status(404).json({ error: 'Property not found' });

    let success = false;
    db.transaction(() => {
      // 1. Mark payment as completed
      db.prepare(`
        UPDATE payments 
        SET status = 'completed', 
            payment_method = 'manual_admin', 
            razorpay_payment_id = ?, 
            paid_at = CURRENT_TIMESTAMP 
        WHERE property_id = ?
      `).run('manual_' + crypto.randomUUID().substring(0, 8), id);

      // 2. Approve property listing
      db.prepare("UPDATE properties SET status = 'approved', is_verified = 1 WHERE id = ?").run(id);

      // 3. Dispatch in-app notification
      const notifId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, body, link) 
        VALUES (?, ?, ?, ?, ?)
      `).run(
        notifId, 
        property.owner_id, 
        'Property Listing Published! 🚀', 
        'Your listing was manually verified and published by our administrator.', 
        '/my-properties'
      );

      success = true;
    })();

    if (success) {
      // 4. Send confirmation email to property owner
      try {
        const owner = db.prepare('SELECT email, full_name FROM users WHERE id = ?').get(property.owner_id);
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
router.post('/:id/resend-payment-link', authenticateToken, requireRole('admin'), (req, res) => {
  const { id } = req.params;

  try {
    const property = db.prepare('SELECT title, owner_id FROM properties WHERE id = ?').get(id);
    if (!property) return res.status(404).json({ error: 'Property not found' });

    const payment = db.prepare('SELECT payment_link FROM payments WHERE property_id = ?').get(id);
    if (!payment || !payment.payment_link) {
      return res.status(404).json({ error: 'No active payment link found for this property listing' });
    }

    const owner = db.prepare('SELECT email, full_name FROM users WHERE id = ?').get(property.owner_id);
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
