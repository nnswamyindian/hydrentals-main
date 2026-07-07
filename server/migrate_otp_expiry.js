/**
 * Migration: Add otp_expires_at to users table for OTP expiry enforcement.
 * Run once: node server/migrate_otp_expiry.js
 */
const db = require('./db');

function addColumnIfMissing(table, column, definition) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`✅ Added column: ${table}.${column}`);
  } catch (err) {
    if (err.message && err.message.toLowerCase().includes('duplicate column')) {
      console.log(`ℹ️  Column already exists: ${table}.${column}`);
    } else {
      throw err;
    }
  }
}

console.log('Running OTP expiry migration...');
addColumnIfMissing('users', 'verification_token', 'TEXT');
addColumnIfMissing('users', 'otp_expires_at', 'INTEGER');
console.log('Migration complete.');
