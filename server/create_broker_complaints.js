const db = require('./db');

try {
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
  console.log('[OK] broker_complaints table created or already exists.');

  // Also fix visit_requests table - add owner_id and visit_time columns if missing
  try {
    db.exec(`ALTER TABLE visit_requests ADD COLUMN owner_id TEXT`);
    console.log('[OK] Added owner_id to visit_requests');
  } catch(e) {
    console.log('[SKIP] owner_id already exists in visit_requests');
  }

  try {
    db.exec(`ALTER TABLE visit_requests ADD COLUMN visit_date TEXT`);
    console.log('[OK] Added visit_date to visit_requests');
  } catch(e) {
    console.log('[SKIP] visit_date already exists in visit_requests');
  }

  try {
    db.exec(`ALTER TABLE visit_requests ADD COLUMN visit_time TEXT`);
    console.log('[OK] Added visit_time to visit_requests');
  } catch(e) {
    console.log('[SKIP] visit_time already exists in visit_requests');
  }

  try {
    db.exec(`ALTER TABLE visit_requests ADD COLUMN note TEXT`);
    console.log('[OK] Added note to visit_requests');
  } catch(e) {
    console.log('[SKIP] note already exists in visit_requests');
  }

  // Check existing tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('\n[DB] All tables:', tables.map(t => t.name).join(', '));

} catch(e) {
  console.error('Error:', e.message);
}
