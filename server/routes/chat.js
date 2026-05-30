const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all conversations for the authenticated user
router.get('/conversations', authenticateToken, (req, res) => {
  const userId = req.user.id;
  try {
    // We want the most recent message per partner in an easy-to-use format.
    // Instead of complex Group Bys on SQLite, fetch all messages related to the user
    // and process in Node for simplicity, or do a simple query.
    // Given the scale, fetching all of a user's messages is fast enough.
    
    const messages = db.prepare(`
      SELECT * FROM messages 
      WHERE sender_id = ? OR receiver_id = ?
      ORDER BY created_at DESC
    `).all(userId, userId);

    const conversationMap = new Map();

    messages.forEach(msg => {
      const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      const key = `${partnerId}::${msg.property_id || 'general'}`;

      if (!conversationMap.has(key)) {
        conversationMap.set(key, []);
      }
      conversationMap.get(key).push(msg);
    });

    const convos = [];

    // Get unique partner IDs
    const partnerIds = [...new Set([...conversationMap.keys()].map(k => k.split('::')[0]))];
    
    // Fetch partner profiles
    let partnerMap = new Map();
    if (partnerIds.length > 0) {
      const placeholders = partnerIds.map(() => '?').join(',');
      const partners = db.prepare(`SELECT id, full_name, avatar_url FROM users WHERE id IN (${placeholders})`).all(...partnerIds);
      partnerMap = new Map(partners.map(p => [p.id, p]));
    }

    // Fetch properties
    const propertyIds = [...new Set(
      [...conversationMap.values()]
        .map(msgs => msgs[0].property_id)
        .filter(Boolean)
    )];
    
    let propertyMap = new Map();
    if (propertyIds.length > 0) {
      const placeholders = propertyIds.map(() => '?').join(',');
      const properties = db.prepare(`SELECT id, title FROM properties WHERE id IN (${placeholders})`).all(...propertyIds);
      propertyMap = new Map(properties.map(p => [p.id, p.title]));
    }

    for (const [key, msgs] of conversationMap.entries()) {
      const [partnerId] = key.split('::');
      const lastMsg = msgs[0];
      const unread = msgs.filter(m => m.receiver_id === userId && !m.is_read).length;
      const partner = partnerMap.get(partnerId);

      convos.push({
        partnerId,
        partnerName: partner?.full_name || 'Unknown User',
        partnerAvatar: partner?.avatar_url || null,
        propertyId: lastMsg.property_id,
        propertyTitle: lastMsg.property_id ? propertyMap.get(lastMsg.property_id) || null : null,
        lastMessage: lastMsg.content,
        lastMessageTime: lastMsg.created_at,
        unreadCount: unread,
      });
    }

    // Sort by recent message time
    convos.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

    res.json({ data: convos });
  } catch (err) {
    console.error('Error fetching conversations:', err.message);
    res.status(500).json({ error: 'Failed to fetch conversations.' });
  }
});

// Get messages for a specific conversation and mark unread as read
router.get('/messages/:partnerId', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const partnerId = req.params.partnerId;

  try {
    const messages = db.prepare(`
      SELECT * FROM messages 
      WHERE (sender_id = ? AND receiver_id = ?) 
         OR (sender_id = ? AND receiver_id = ?)
      ORDER BY created_at ASC
    `).all(userId, partnerId, partnerId, userId);

    // Explicit numeric boolean conversion if SQLite returned 0/1
    const formattedMessages = messages.map(m => ({
        ...m,
        is_read: Boolean(m.is_read)
    }));

    // Mark partner's messages to me as read
    db.prepare(`
      UPDATE messages 
      SET is_read = 1 
      WHERE sender_id = ? AND receiver_id = ? AND is_read = 0
    `).run(partnerId, userId);

    // Get partner profile too, to send along
    const partner = db.prepare('SELECT id, full_name, avatar_url FROM users WHERE id = ?').get(partnerId) || null;

    res.json({ data: formattedMessages, partner: partner });
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a new message
router.post('/messages', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { receiver_id, content, property_id } = req.body;

  if (!receiver_id || !content) {
    return res.status(400).json({ error: 'Receiver ID and content are required.' });
  }

  try {
    const newId = crypto.randomUUID();
    const cleanContent = content.trim();

    db.prepare(`
      INSERT INTO messages (id, sender_id, receiver_id, property_id, content, is_read)
      VALUES (?, ?, ?, ?, ?, 0)
    `).run(newId, userId, receiver_id, property_id || null, cleanContent);

    const insertedMsg = db.prepare('SELECT * FROM messages WHERE id = ?').get(newId);
    if(insertedMsg) insertedMsg.is_read = Boolean(insertedMsg.is_read);

    // Optional: Log an internal notification. (We recreate the edge function polyfill internally)
    try {
        const notifId = crypto.randomUUID();
        const notificationText = `New message received.`;
        db.prepare(`
            INSERT INTO notifications (id, user_id, title, body, link)
            VALUES (?, ?, ?, ?, ?)
        `).run(notifId, receiver_id, 'New Message', notificationText, '/messages');
    } catch(err) {}

    res.json({ data: insertedMsg });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

module.exports = router;
