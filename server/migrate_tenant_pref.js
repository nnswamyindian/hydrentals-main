const db = require('./db');

console.log('Running migration...');
try {
  // Check if column exists by attempting to select it
  try {
    db.prepare('SELECT tenant_preference FROM properties LIMIT 1').get();
    console.log('Column tenant_preference already exists.');
  } catch (err) {
    if (err.message.includes('no such column')) {
      console.log('Adding tenant_preference column to properties table...');
      db.exec(`ALTER TABLE properties ADD COLUMN tenant_preference TEXT DEFAULT 'any'`);
      console.log('Column added successfully.');
    } else {
      throw err;
    }
  }
} catch (error) {
  console.error('Migration failed:', error);
}
console.log('Done.');
