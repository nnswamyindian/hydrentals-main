const db = require('./db');

// Add missing columns to community_badges
const alterations = [
  { col: 'badge_code', def: 'TEXT' },
  { col: 'description', def: 'TEXT' },
  { col: 'issued_at', def: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
];

alterations.forEach(({ col, def }) => {
  try {
    db.exec(`ALTER TABLE community_badges ADD COLUMN ${col} ${def}`);
    console.log(`[OK] Added ${col} to community_badges`);
  } catch(e) {
    console.log(`[SKIP] ${col} already exists`);
  }
});

// Verify final schema
const cols = db.prepare("PRAGMA table_info(community_badges)").all();
console.log('\nFinal community_badges columns:', cols.map(c => c.name).join(', '));

// Also verify visit_requests final schema
const vr = db.prepare("PRAGMA table_info(visit_requests)").all();
console.log('Final visit_requests columns:', vr.map(c => c.name).join(', '));
