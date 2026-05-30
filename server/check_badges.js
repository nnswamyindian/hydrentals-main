const db = require('./db');

// Check community_badges columns
const cols = db.prepare("PRAGMA table_info(community_badges)").all();
console.log('community_badges columns:', cols.map(c => c.name).join(', '));

// The frontend expects: badge_name, badge_code, issued_at, description
// The setup.js has: badge_name, earned_at
// These are mismatched!
