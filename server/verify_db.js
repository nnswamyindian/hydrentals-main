const db = require('./db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('ALL Tables:', tables.map(t => t.name).join(', '));

// Check broker_complaints columns
const bc = db.prepare("PRAGMA table_info(broker_complaints)").all();
console.log('\nbroker_complaints columns:', bc.map(c => c.name).join(', '));

// Check visit_requests columns
const vr = db.prepare("PRAGMA table_info(visit_requests)").all();
console.log('visit_requests columns:', vr.map(c => c.name).join(', '));

// Check property_reports columns
const pr = db.prepare("PRAGMA table_info(property_reports)").all();
console.log('property_reports columns:', pr.map(c => c.name).join(', '));
