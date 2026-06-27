const express = require('express');
const db = require('../db');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    let { table, action, columns, payload, modifiers } = req.body;

    if (table === 'user_roles') {
      table = 'users';
      if (action === 'select') {
         modifiers = modifiers.map(m => m.column === 'user_id' ? {...m, column: 'id'} : m);
      } else if (action === 'insert') {
         action = 'update';
         payload = { role: payload.role };
         modifiers = [{ type: 'eq', column: 'id', value: req.body.payload.user_id }];
      }
    }

    if (table === 'profiles_public' || table === 'profiles') {
      table = 'users'; // Map alias used for real-time messaging
    }

    const ALLOWED_SCHEMAS = {
      users: ['id', 'email', 'password_hash', 'full_name', 'phone', 'role', 'is_verified', 'avatar_url', 'created_at'],
      properties: ['id', 'owner_id', 'title', 'description', 'property_type', 'room_type', 'listing_type', 'rent', 'sale_price', 'deposit', 'maintenance', 'locality', 'address', 'city', 'pincode', 'latitude', 'longitude', 'furnished_status', 'amenities', 'tenant_preference', 'gender_preference', 'food_available', 'pets_allowed', 'available_from', 'images', 'is_verified', 'is_direct_owner', 'status', 'unavailable_dates', 'created_at'],
      payments: ['id', 'user_id', 'property_id', 'amount', 'status', 'payment_type', 'payment_method', 'transaction_id', 'razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature', 'payment_link', 'paid_at', 'created_at'],
      favorites: ['id', 'user_id', 'property_id', 'created_at'],
      messages: ['id', 'sender_id', 'receiver_id', 'property_id', 'content', 'is_read', 'created_at'],
      notifications: ['id', 'user_id', 'title', 'body', 'is_read', 'link', 'created_at'],
      saved_searches: ['id', 'user_id', 'name', 'filters', 'created_at'],
      visit_requests: ['id', 'property_id', 'tenant_id', 'owner_id', 'visit_date', 'visit_time', 'note', 'status', 'message', 'scheduled_visit', 'created_at'],
      complaints: ['id', 'user_id', 'property_id', 'subject', 'description', 'status', 'created_at'],
      reviews: ['id', 'user_id', 'property_id', 'rating', 'comment', 'created_at'],
      property_views: ['id', 'property_id', 'session_id', 'viewed_at'],
      property_reports: ['id', 'reporter_id', 'property_id', 'reason', 'description', 'created_at'],
      community_badges: ['id', 'user_id', 'badge_name', 'badge_code', 'description', 'issued_at', 'earned_at'],
      broker_complaints: ['id', 'user_id', 'complainant_name', 'complainant_email', 'complainant_phone', 'broker_name', 'broker_phone', 'property_reference', 'description', 'status', 'created_at']
    };

    if (!ALLOWED_SCHEMAS[table]) {
      return res.status(400).json({ error: `Invalid table schema request: ${table}` });
    }

    const validCols = ALLOWED_SCHEMAS[table];

    if (modifiers && Array.isArray(modifiers)) {
      for (const mod of modifiers) {
        if (mod.column && !validCols.includes(mod.column)) {
          return res.status(400).json({ error: `Invalid query column parameter: ${mod.column}` });
        }
      }
    }

    if (payload) {
      for (const col of Object.keys(payload)) {
        if (!validCols.includes(col)) {
          return res.status(400).json({ error: `Invalid payload data column: ${col}` });
        }
      }
    }

    // Verify User Role via JWT Context
    let user = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      try { user = jwt.verify(token, JWT_SECRET); } catch (e) { }
    }

    // Security Gate check
    if (action === 'insert' && table === 'properties' && payload) {
      payload.status = 'pending';
      if (!user) return res.status(401).json({ error: 'Unauthorized to insert property' });
    }

    if (action === 'select') {
      let queryStr = `SELECT * FROM ${table.replace(/[^a-zA-Z0-9_]/g, '')} WHERE 1=1`;
      let params = [];

      modifiers.forEach(mod => {
        if (mod.type === 'eq') { queryStr += ` AND ${mod.column} = ?`; params.push(mod.value); }
        if (mod.type === 'neq') { queryStr += ` AND ${mod.column} != ?`; params.push(mod.value); }
        if (mod.type === 'gte') { queryStr += ` AND ${mod.column} >= ?`; params.push(mod.value); }
        if (mod.type === 'lte') { queryStr += ` AND ${mod.column} <= ?`; params.push(mod.value); }
        if (mod.type === 'ilike') { queryStr += ` AND ${mod.column} LIKE ?`; params.push(mod.value.replace(/%/g, '')); }
        if (mod.type === 'in') {
          const placeholders = mod.value.map(() => '?').join(',');
          queryStr += ` AND ${mod.column} IN (${placeholders})`;
          params.push(...mod.value);
        }
        if (mod.type === 'contains') { 
          // SQLite JSON / List String approximation
          queryStr += ` AND ${mod.column} LIKE ?`; 
          params.push(`%${mod.value.replace(/\[|\]/g, '')}%`); 
        }
        if (mod.type === 'or') {
          const conditions = mod.value.split(',');
          const parsed = conditions.map(c => {
            const [col, op, val] = c.split('.');
            params.push(val.replace(/%/g, ''));
            return `${col} LIKE '%' || ? || '%'`;
          });
          queryStr += ` AND (${parsed.join(' OR ')})`;
        }
      });

      const orderMod = modifiers.find(m => m.type === 'order');
      if (orderMod) {
        queryStr += ` ORDER BY ${orderMod.column} ${orderMod.value ? 'ASC' : 'DESC'}`;
      }

      const rangeMod = modifiers.find(m => m.type === 'range');
      if (rangeMod) {
        queryStr += ` LIMIT ${rangeMod.to - rangeMod.from + 1} OFFSET ${rangeMod.from}`;
      } else {
        const limitMod = modifiers.find(m => m.type === 'limit');
        if (limitMod) {
          queryStr += ` LIMIT ${limitMod.value}`;
        } else {
          const hasSingle = modifiers.some(m => m.type === 'single' || m.type === 'maybeSingle');
          if (hasSingle) queryStr += ' LIMIT 1';
        }
      }

      try {
        const stmt = db.prepare(queryStr);
        let data = stmt.all(...params);

        const arrayFields = ['images', 'amenities', 'unavailable_dates'];
        
        // Deep formatting & recursive joins
        data = data.map(d => {
           for (const field of arrayFields) {
               if (d[field]) {
                   try { d[field] = JSON.parse(d[field]); } catch(e) { d[field] = []; }
               } else if (d[field] === null && table === 'properties') {
                   d[field] = []; // explicit fallback mapping
               }
           }
           if (d.filters) {
               try { d.filters = JSON.parse(d.filters); } catch(e) { d.filters = {}; }
           }

           // Explicit booleans casting for typical Supabase hooks
           ['is_verified', 'is_direct_owner', 'food_available', 'pets_allowed', 'is_read'].forEach(bool => {
              if (d[bool] !== undefined) d[bool] = Boolean(d[bool]);
           });
           
           return d;
        });

        if (columns) {
          if (columns.includes('profiles_public')) {
            const profiles = db.prepare('SELECT id, is_verified, full_name, avatar_url FROM users').all();
            data = data.map(d => {
               d.profiles_public = profiles.find(p => p.id === d.owner_id) || null;
               return d;
            });
          }
          if (columns.includes('properties')) {
            const allPropsRaw = db.prepare('SELECT * FROM properties').all();
            data = data.map(d => {
               const matchingProp = allPropsRaw.find(p => p.id === d.property_id);
               if (matchingProp) {
                  for (const field of arrayFields) {
                     if (matchingProp[field]) {
                         try { matchingProp[field] = JSON.parse(matchingProp[field]); } catch(e) { matchingProp[field] = []; }
                     } else {
                         matchingProp[field] = [];
                     }
                  }
                  ['is_verified', 'is_direct_owner', 'food_available', 'pets_allowed'].forEach(bool => {
                     if (matchingProp[bool] !== undefined) matchingProp[bool] = Boolean(matchingProp[bool]);
                  });
               }
               d.properties = matchingProp || null;
               return d;
            });
          }
          if (columns.includes('payments')) {
             const allPaymentsRaw = db.prepare('SELECT * FROM payments').all();
             data = data.map(d => {
                d.payments = allPaymentsRaw.find(p => p.property_id === d.id) || null;
                return d;
             });
          }
        }

        res.json({ data });
      } catch (sqlErr) {
        console.error('REST Select SQLite Parse Warning:', sqlErr.message);
        res.json({ data: [] });
      }
    } 
    
    else if (action === 'insert') {
      if (!payload.id) payload.id = crypto.randomUUID();
      
      const keys = Object.keys(payload);
      const insertKeys = keys.join(',');
      const insertBind = keys.map(() => '?').join(',');
      const queryStr = `INSERT INTO ${table} (${insertKeys}) VALUES (${insertBind})`;
      
      try {
        const bindValues = Object.values(payload).map(v => {
          if (typeof v === 'boolean') return v ? 1 : 0;
          if (typeof v === 'object' && v !== null) return JSON.stringify(v);
          return v;
        });
        console.log(`[REST Insert] Table: ${table}`);
        console.log(`[REST Insert] Query: ${queryStr}`);
        console.log(`[REST Insert] BindValues:`, bindValues);
        
        db.prepare(queryStr).run(bindValues);
        const insertedRow = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(payload.id);
        
        // Ensure returning actual object so the client doesn't get an empty/null that drops their UI updates
        const returnData = insertedRow ? insertedRow : payload;
        
        res.json({ data: [returnData] });

        // Trigger emails and notifications for new property submissions
        if (table === 'properties' && payload.owner_id) {
          // 1. Send submission emails via emailService
          try {
            const owner = db.prepare('SELECT email, full_name FROM users WHERE id = ?').get(payload.owner_id);
            if (owner) {
              const admins = db.prepare("SELECT email FROM users WHERE role = 'admin'").all();
              const adminEmails = admins.map(a => a.email).filter(Boolean);
              if (adminEmails.length === 0) {
                adminEmails.push('admin@hydrentals.com');
              }
              
              const { sendPropertySubmissionEmails } = require('../emailService');
              sendPropertySubmissionEmails(owner.email, owner.full_name || 'Property Owner', payload.title, payload.id, adminEmails);
            }
          } catch (emailErr) {
            console.error('Failed to trigger property submission emails in rest.js:', emailErr.message);
          }

          // 2. In-app notification for the property owner
          try {
            const notifId = crypto.randomUUID();
            db.prepare('INSERT INTO notifications (id, user_id, title, body, link) VALUES (?, ?, ?, ?, ?)').run(
              notifId, payload.owner_id, 'Property Submitted Successfully', `Your property "${payload.title}" has been submitted and is pending verification.`, '/my-properties'
            );
          } catch (notifErr) {
            console.error('Failed to insert owner submission notification:', notifErr.message);
          }

          // 3. In-app notifications for admins
          try {
            const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
            admins.forEach(admin => {
              const notifId = crypto.randomUUID();
              db.prepare('INSERT INTO notifications (id, user_id, title, body, link) VALUES (?, ?, ?, ?, ?)').run(
                notifId, admin.id, 'New Property Pending Approval', `A new property "${payload.title}" has been submitted and requires review.`, '/admin/properties'
              );
            });
          } catch (notifErr) {
            console.error('Failed to insert admin submission notification:', notifErr.message);
          }
        }
      } catch (sqlErr) {
        console.error('[REST Insert SQL Error]', sqlErr.message);
        res.status(500).json({ data: null, error: sqlErr.message });
      }
    }

    else if (action === 'update') {
      const isAdmin = user && user.role === 'admin';

      // 1. Secure payments table updates (Admins only)
      if (table === 'payments' && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden: Only administrators can update payment records.' });
      }

      // 2. Secure properties table updates (Admins & Owners only)
      if (table === 'properties') {
        const idMod = modifiers.find(m => m.type === 'eq' && m.column === 'id');
        if (!idMod) {
          return res.status(400).json({ error: 'Property ID filter missing for update.' });
        }
        
        const existingProperty = db.prepare('SELECT owner_id, status FROM properties WHERE id = ?').get(idMod.value);
        if (!existingProperty) {
          return res.status(404).json({ error: 'Property not found.' });
        }

        if (!isAdmin) {
          // Check ownership
          if (existingProperty.owner_id !== user.id) {
            return res.status(403).json({ error: 'Forbidden: You do not own this property.' });
          }
          
          // Non-admins cannot alter status to approved/pending_payment/rejected directly, but can mark as rented/sold/deleted/inactive
          const allowedStatuses = ['pending', 'rented', 'sold', 'rented_out', 'sold_out'];
          if (payload.status && !allowedStatuses.includes(payload.status)) {
            return res.status(403).json({ error: 'Forbidden: Owners cannot change property status directly to this value.' });
          }
          
          // Non-admins cannot alter is_verified
          if (payload.is_verified !== undefined) {
            delete payload.is_verified;
          }
        }

        // Reset payment status if property changes from approved to any inactive/rented/sold status
        if (existingProperty.status === 'approved' && payload.status && payload.status !== 'approved') {
          const ownerUser = db.prepare('SELECT role FROM users WHERE id = ?').get(existingProperty.owner_id);
          const isOwnerSubAdmin = ownerUser && ownerUser.role === 'subadmin';
          if (!isOwnerSubAdmin) {
            db.prepare("UPDATE payments SET status = 'pending' WHERE property_id = ?").run(idMod.value);
            console.log(`[REST Update] Reset payment status to pending for property ${idMod.value} (deactivated from approved)`);
          }
        }
      }

      // Fetch properties before update to detect status changes
      let oldProperties = [];
      if (table === 'properties' && payload.status) {
        const idMod = modifiers.find(m => m.type === 'eq' && m.column === 'id');
        if (idMod) {
          oldProperties = db.prepare('SELECT id, owner_id, title, status FROM properties WHERE id = ?').all(idMod.value);
        }
      }

      // 3. Intercept property approval by Admin -> change to pending_payment, create link
      if (table === 'properties' && payload.status === 'approved' && isAdmin) {
        if (oldProperties.length > 0 && (oldProperties[0].status === 'pending' || oldProperties[0].status === 'rejected')) {
          const propOwnerId = oldProperties[0].owner_id;
          const ownerUser = db.prepare('SELECT role FROM users WHERE id = ?').get(propOwnerId);
          if (ownerUser && ownerUser.role === 'subadmin') {
            console.log(`[REST Update] Property approved for sub-admin owner. Bypassing payment.`);
          } else {
            payload.status = 'pending_payment';
            
            const propertyId = oldProperties[0].id;
            const ownerId = oldProperties[0].owner_id;
            const owner = db.prepare('SELECT email, full_name, phone FROM users WHERE id = ?').get(ownerId);
          
          let paymentLinkUrl = '';
          let razorpayOrderId = '';
          
          const key_id = process.env.RAZORPAY_KEY_ID;
          const key_secret = process.env.RAZORPAY_KEY_SECRET;
          
          if (!key_id || !key_secret) {
            console.error('❌ CRITICAL: Razorpay credentials missing on admin approval.');
            return res.status(500).json({ error: 'CRITICAL: Razorpay API keys are not configured in the server environment.' });
          }

          try {
            const Razorpay = require('razorpay');
            const razorpay = new Razorpay({
              key_id,
              key_secret
            });
            
            const linkData = await razorpay.paymentLink.create({
              amount: 50000, // ₹500
              currency: 'INR',
              accept_partial: false,
              description: 'HYD Rentals Property Listing Fee',
              customer: {
                name: owner.full_name || 'Property Owner',
                email: owner.email,
                contact: owner.phone || ''
              },
              notify: {
                sms: false,
                email: false
              },
              notes: {
                property_id: propertyId,
                user_id: ownerId
              },
              callback_url: `${req.headers.origin || 'http://localhost:5173'}/payment/success?property_id=${propertyId}`,
              callback_method: 'get'
            });
            
            paymentLinkUrl = linkData.short_url;
            razorpayOrderId = linkData.order_id || linkData.id;
          } catch (razorpayErr) {
            console.error('Error creating Razorpay Payment Link:', razorpayErr.message);
            return res.status(500).json({ error: `Razorpay Integration Error: ${razorpayErr.message}` });
          }
          
          // Update/insert listing payment log
          const existingPayment = db.prepare('SELECT id FROM payments WHERE property_id = ?').get(propertyId);
          if (existingPayment) {
            db.prepare('UPDATE payments SET amount = 500, status = \'pending\', payment_link = ?, razorpay_order_id = ? WHERE property_id = ?')
              .run(paymentLinkUrl, razorpayOrderId, propertyId);
          } else {
            const paymentId = crypto.randomUUID();
            db.prepare('INSERT INTO payments (id, user_id, property_id, amount, status, payment_type, payment_link, razorpay_order_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
              .run(paymentId, ownerId, propertyId, 500, 'pending', 'listing_fee', paymentLinkUrl, razorpayOrderId);
          }
          
          // Send invoice notification email
          try {
            const { sendPropertyApprovalPaymentEmail } = require('../emailService');
            sendPropertyApprovalPaymentEmail(owner.email, owner.full_name || 'Property Owner', oldProperties[0].title, paymentLinkUrl);
          } catch (emailErr) {
            console.error('Failed to send property approval payment email:', emailErr.message);
          }
          
          // Emit in-app notification to Owner
          try {
            const notifId = crypto.randomUUID();
            db.prepare('INSERT INTO notifications (id, user_id, title, body, link) VALUES (?, ?, ?, ?, ?)').run(
              notifId, 
              ownerId, 
              'Property Approved - Payment Required', 
              `Your property "${oldProperties[0].title}" has been approved. Please complete the listing fee payment to publish it.`, 
              `/dashboard`
            );
          } catch (notifErr) {
            console.error('Failed to create owner notification for property approval:', notifErr.message);
          }
        }
      }
    }

      const keys = Object.keys(payload);
      const setArray = keys.map(k => `${k} = ?`).join(', ');
      
      let queryStr = `UPDATE ${table} SET ${setArray} WHERE 1=1`;
      let params = Object.values(payload).map(v => {
          if (typeof v === 'boolean') return v ? 1 : 0;
          if (typeof v === 'object' && v !== null) return JSON.stringify(v);
          return v;
      });

      modifiers.forEach(mod => {
        if (mod.type === 'eq') { queryStr += ` AND ${mod.column} = ?`; params.push(mod.value); }
      });

      try {
        db.prepare(queryStr).run(...params);
        res.json({ data: [payload] });

        // Trigger notifications for status change (approve / reject)
        if (table === 'properties' && payload.status && oldProperties.length > 0) {
          const newStatus = payload.status;
          oldProperties.forEach(prop => {
            if (prop.status !== newStatus) {
              let title = '';
              let body = '';
              if (newStatus === 'approved') {
                title = 'Property Approved! 🎉';
                body = `Your property listing "${prop.title}" has been verified and approved.`;
              } else if (newStatus === 'rejected') {
                title = 'Property Rejected ⚠️';
                body = `Your property listing "${prop.title}" was rejected during verification.`;
              }

              if (title) {
                try {
                  const notifId = crypto.randomUUID();
                  db.prepare('INSERT INTO notifications (id, user_id, title, body, link) VALUES (?, ?, ?, ?, ?)').run(
                    notifId, prop.owner_id, title, body, '/my-properties'
                  );
                } catch (notifErr) {
                  console.error('Failed to insert property status update notification:', notifErr.message);
                }
              }
            }
          });
        }
      } catch (sqlErr) {
         res.json({ data: null, error: sqlErr.message });
      }
    }
    
    else if (action === 'delete') {
      const isAdmin = user && user.role === 'admin';
      if (table === 'properties') {
        const idMod = modifiers.find(m => m.type === 'eq' && m.column === 'id');
        if (!idMod) {
          return res.status(400).json({ error: 'Property ID filter missing for delete.' });
        }
        
        const existingProperty = db.prepare('SELECT owner_id FROM properties WHERE id = ?').get(idMod.value);
        if (!existingProperty) {
          return res.status(404).json({ error: 'Property not found.' });
        }
        
        if (!isAdmin && (!user || existingProperty.owner_id !== user.id)) {
          return res.status(403).json({ error: 'Forbidden: You do not own this property.' });
        }
      }

      let queryStr = `DELETE FROM ${table} WHERE 1=1`;
      let params = [];
      modifiers.forEach(mod => {
        if (mod.type === 'eq') { queryStr += ` AND ${mod.column} = ?`; params.push(mod.value); }
      });
      try {
        db.prepare(queryStr).run(...params);
        res.json({ data: [] });
      } catch (sqlErr) {
         res.json({ data: null, error: sqlErr.message });
      }
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'API REST Compilation Error' });
  }
});

module.exports = router;
