const db = require('./db');

// Get all actual DB tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
console.log('=== DATABASE TABLES ===');
tables.forEach(t => console.log('  [OK]', t));

// All tables the front-end uses
const frontendTables = [
  'properties', 'users', 'profiles', 'profiles_public',
  'favorites', 'messages', 'notifications',
  'saved_searches', 'visit_requests', 'complaints', 'reviews',
  'property_views', 'property_reports', 'broker_complaints',
  'community_badges', 'payments', 'user_roles'
];

console.log('\n=== FRONTEND TABLE USAGE CHECK ===');
frontendTables.forEach(ft => {
  // user_roles, profiles, profiles_public are aliases
  const aliases = { user_roles: 'users', profiles: 'users', profiles_public: 'users' };
  const actual = aliases[ft] || ft;
  if (tables.includes(actual)) {
    console.log(`  [OK] "${ft}" -> "${actual}"`);
  } else {
    console.error(`  [MISSING] "${ft}" table NOT found in database!`);
  }
});

// Check visit_requests columns
console.log('\n=== VISIT_REQUESTS COLUMNS ===');
const vrCols = db.prepare("PRAGMA table_info(visit_requests)").all();
vrCols.forEach(c => console.log(`  ${c.name} (${c.type})`));

// Check broker_complaints columns
console.log('\n=== BROKER_COMPLAINTS COLUMNS ===');
const bcCols = db.prepare("PRAGMA table_info(broker_complaints)").all();
bcCols.forEach(c => console.log(`  ${c.name} (${c.type})`));
