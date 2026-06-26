const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath, { verbose: console.log });

// Enable Write-Ahead Logging for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run SQLite migrations automatically on start
const columnsToAdd = [
  { name: 'payment_method', type: 'TEXT' },
  { name: 'transaction_id', type: 'TEXT' },
  { name: 'razorpay_order_id', type: 'TEXT' },
  { name: 'razorpay_payment_id', type: 'TEXT' },
  { name: 'razorpay_signature', type: 'TEXT' },
  { name: 'payment_link', type: 'TEXT' },
  { name: 'paid_at', type: 'DATETIME' }
];

for (const col of columnsToAdd) {
  try {
    db.prepare(`ALTER TABLE payments ADD COLUMN ${col.name} ${col.type}`).run();
    console.log(`Added column ${col.name} to payments table`);
  } catch (e) {
    // Column already exists, ignore error
  }
}

module.exports = db;
