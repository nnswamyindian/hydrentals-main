const db = require('./db');
const crypto = require('crypto');

// Test insert for broker_complaints exactly as the frontend sends it
const testPayload = {
  id: crypto.randomUUID(),
  user_id: null,
  complainant_name: 'Test User',
  complainant_email: 'test@test.com',
  complainant_phone: null,
  broker_name: 'Bad Broker',
  broker_phone: null,
  property_reference: null,
  description: 'This broker is pretending to be an owner'
};

const keys = Object.keys(testPayload);
const insertKeys = keys.join(',');
const insertBind = keys.map(() => '?').join(',');
const queryStr = `INSERT INTO broker_complaints (${insertKeys}) VALUES (${insertBind})`;

const bindValues = Object.values(testPayload).map(v => {
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'object' && v !== null) return JSON.stringify(v);
  return v;
});

try {
  db.prepare(queryStr).run(bindValues);
  const inserted = db.prepare('SELECT * FROM broker_complaints WHERE id = ?').get(testPayload.id);
  console.log('[SUCCESS] broker_complaints insert works!');
  console.log('Inserted:', inserted);

  // Clean up test data
  db.prepare('DELETE FROM broker_complaints WHERE id = ?').run(testPayload.id);
  console.log('[CLEANUP] Test record removed.');
} catch(e) {
  console.error('[ERROR]', e.message);
}
