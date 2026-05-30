require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { sendBrokerReportConfirmation } = require('../emailService');

const router = express.Router();

// POST /api/contact/report-broker
// Accepts broker complaint, saves to DB, sends confirmation email to reporter
router.post('/report-broker', async (req, res) => {
  try {
    const {
      complainant_name,
      complainant_email,
      complainant_phone,
      broker_name,
      broker_phone,
      property_reference,
      description,
      user_id,
    } = req.body;

    // Basic validation
    if (!complainant_name || !complainant_email || !broker_name || !description) {
      return res.status(400).json({ error: 'Required fields are missing.' });
    }
    if (description.trim().length < 20) {
      return res.status(400).json({ error: 'Description must be at least 20 characters.' });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Ensure broker_complaints table exists (idempotent)
    db.exec(`
      CREATE TABLE IF NOT EXISTS broker_complaints (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        complainant_name TEXT NOT NULL,
        complainant_email TEXT NOT NULL,
        complainant_phone TEXT,
        broker_name TEXT NOT NULL,
        broker_phone TEXT,
        property_reference TEXT,
        description TEXT NOT NULL,
        status TEXT DEFAULT 'open',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Insert complaint
    db.prepare(`
      INSERT INTO broker_complaints
        (id, user_id, complainant_name, complainant_email, complainant_phone, broker_name, broker_phone, property_reference, description, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)
    `).run(
      id,
      user_id || null,
      complainant_name.trim(),
      complainant_email.trim().toLowerCase(),
      complainant_phone?.trim() || null,
      broker_name.trim(),
      broker_phone?.trim() || null,
      property_reference?.trim() || null,
      description.trim(),
      now
    );

    console.log(`[Contact] ✅ Broker complaint saved: ${id} | Reporter: ${complainant_email} | Broker: ${broker_name}`);

    // Send confirmation email (non-blocking — don't fail the response if email fails)
    sendBrokerReportConfirmation(
      complainant_email.trim(),
      complainant_name.trim(),
      broker_name.trim(),
      id
    ).then(sent => {
      if (sent) {
        console.log(`[Contact] 📧 Confirmation email dispatched to ${complainant_email}`);
      } else {
        console.warn(`[Contact] ⚠️ Confirmation email could not be sent to ${complainant_email}`);
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully. A confirmation email has been sent to you.',
      complaint_id: id,
    });

  } catch (err) {
    console.error('[Contact] ❌ Error saving broker complaint:', err.message);
    return res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// PUT /api/contact/report-broker/:id/status
// Updates broker complaint status and sends notification email
router.put('/report-broker/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'investigating', 'resolved', 'dismissed', 'open'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status provided.' });
    }

    // Update status in db
    const info = db.prepare('UPDATE broker_complaints SET status = ? WHERE id = ?').run(status, id);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    // Fetch complaint to get email and user context
    const complaint = db.prepare('SELECT * FROM broker_complaints WHERE id = ?').get(id);

    if (complaint) {
      // Send email notification
      if (complaint.complainant_email) {
        const { sendComplaintStatusUpdate } = require('../emailService');
        sendComplaintStatusUpdate(
          complaint.complainant_email,
          complaint.complainant_name,
          complaint.broker_name,
          complaint.id,
          status
        );
      }

      // Insert in-app notification if user is registered
      if (complaint.user_id) {
        const crypto = require('crypto');
        const notifId = crypto.randomUUID();
        const title = "Broker Complaint Update";
        const body = `Your report against ${complaint.broker_name} has been marked as ${status}.`;
        try {
          db.prepare('INSERT INTO notifications (id, user_id, title, body, link) VALUES (?, ?, ?, ?, ?)').run(
            notifId, complaint.user_id, title, body, '/dashboard'
          );
        } catch (e) {
          console.error('[Contact] Failed to insert notification:', e.message);
        }
      }
    }

    return res.json({ success: true, message: 'Status updated successfully.', data: complaint });
  } catch (err) {
    console.error('[Contact] ❌ Error updating complaint status:', err.message);
    return res.status(500).json({ error: 'Server error updating status.' });
  }
});

module.exports = router;
