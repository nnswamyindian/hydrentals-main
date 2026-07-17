const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Simplistic AI Chatbot Search via SQLite
router.post('/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message requirement missing' });
  
  const msgLower = message.toLowerCase();
  // Using status = approved to get active published properties locally
  let queryStr = "SELECT * FROM properties WHERE status = 'approved'"; 
  
  const conditions = [];
  const params = [];
  
  if (msgLower.includes('rent') || msgLower.includes('rental')) conditions.push("listing_type = 'rent'");
  if (msgLower.includes('sale') || msgLower.includes('buy')) conditions.push("listing_type = 'sale'");
  if (msgLower.includes('pg') || msgLower.includes('hostel')) conditions.push("property_type = 'pg'");
  if (msgLower.includes('coworking') || msgLower.includes('co-working')) conditions.push("property_type = 'coworking'");
  if (msgLower.includes('family')) conditions.push("tenant_preference IN ('family', 'any')");
  if (msgLower.includes('bachelor')) conditions.push("tenant_preference IN ('bachelor', 'any')");
  
  const locs = ['gachibowli', 'madhapur', 'kondapur', 'kphb', 'kukatpally', 'hitec city', 'banjara hills', 'jubilee hills', 'ameerpet'];
  const matchedLocs = locs.filter(l => msgLower.includes(l));
  if (matchedLocs.length > 0) {
      const locConditions = matchedLocs.map(() => "LOWER(locality) LIKE ?").join(" OR ");
      conditions.push(`(${locConditions})`);
      matchedLocs.forEach(l => params.push(`%${l}%`));
  }
  
  if (conditions.length > 0) queryStr += " AND " + conditions.join(" AND ");
  queryStr += " LIMIT 3";
  
  try {
     const properties = db.prepare(queryStr).all(...params);
     let replyText = `I analyzed your request: "${message}".\n\n`;
     if (properties.length === 0) {
        replyText += "Sorry, I couldn't find any properties matching your exact criteria right now on HydRent.";
     } else {
        replyText += `Here are some top options from our live database:\n`;
        properties.forEach(p => {
           const priceDesc = p.listing_type === 'sale' ? `₹${p.sale_price}` : `₹${p.rent}/mo`;
           replyText += `- **${p.title}** (${p.locality})\n  Type: ${p.property_type.toUpperCase()} | Price: ${priceDesc}\n`;
        });
        replyText += `\nCheck out the main search page for full details or ask me about other locations!`;
     }
     res.json({ reply: replyText });
  } catch (err) {
     console.error('Chat AI query error:', err.message);
     res.json({ reply: "Sorry, I'm having trouble analyzing properties right now." });
  }
});

// Property Messaging Notification Generator — requires auth
router.post('/notify-message', authenticateToken, async (req, res) => {
  const { user_id, message_content } = req.body;

  // Only allow a user to create a notification for themselves or if admin
  if (!user_id || (req.user.id !== user_id && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Forbidden: cannot create notifications for other users.' });
  }

  try {
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO notifications (id, user_id, title, body, link) VALUES (?, ?, ?, ?, ?)')
      .run(id, user_id, 'New Message Alert', message_content || 'You have received a new message.', '/messages');

    res.json({ success: true, notification_id: id });
  } catch (err) {
    console.error('Notify route SQLite err:', err.message);
    res.status(500).json({ error: 'Failed native notification drop' });
  }
});

module.exports = router;
