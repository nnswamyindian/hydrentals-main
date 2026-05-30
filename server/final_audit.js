const db = require('./db');
const crypto = require('crypto');

console.log('=== FINAL DATABASE AUDIT ===\n');

// 1. Table check
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
console.log('Tables found:', tables.length);

const required = [
  'users', 'properties', 'favorites', 'messages', 'notifications',
  'saved_searches', 'visit_requests', 'complaints', 'reviews',
  'property_views', 'property_reports', 'broker_complaints',
  'community_badges', 'payments'
];
required.forEach(t => {
  console.log(tables.includes(t) ? `  [OK] ${t}` : `  [MISSING] ${t}`);
});

// 2. Test broker_complaint insert (as frontend would send)
console.log('\n--- Testing broker_complaints insert ---');
const id = crypto.randomUUID();
try {
  db.prepare('INSERT INTO broker_complaints (id, user_id, complainant_name, complainant_email, complainant_phone, broker_name, broker_phone, property_reference, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, null, 'Test User', 'test@test.com', null, 'Bad Broker', null, null, 'Identified as broker from their behavior');
  console.log('  [OK] Insert succeeded');
  db.prepare('DELETE FROM broker_complaints WHERE id = ?').run(id);
  console.log('  [OK] Cleanup done');
} catch(e) {
  console.error('  [FAIL] Insert error:', e.message);
}

// 3. Test visit_request insert (as frontend would send)
console.log('\n--- Testing visit_requests insert ---');
const user = db.prepare('SELECT id FROM users LIMIT 1').get();
const prop = db.prepare('SELECT id, owner_id FROM properties LIMIT 1').get();
if (user && prop) {
  const vid = crypto.randomUUID();
  try {
    db.prepare('INSERT INTO visit_requests (id, property_id, tenant_id, owner_id, visit_date, visit_time, note) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(vid, prop.id, user.id, prop.owner_id, '2026-04-15', '10:00', 'Please confirm in advance');
    console.log('  [OK] visit_requests insert succeeded');
    db.prepare('DELETE FROM visit_requests WHERE id = ?').run(vid);
    console.log('  [OK] Cleanup done');
  } catch(e) {
    console.error('  [FAIL] visit_requests error:', e.message);
  }
} else {
  console.log('  [SKIP] No users/properties data to test with');
}

console.log('\n=== AUDIT COMPLETE ===');
