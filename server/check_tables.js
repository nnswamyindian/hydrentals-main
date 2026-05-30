const db = require('./db');
const t = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
console.log('TABLES:', t.join(' | '));
const toCheck = ['property_views','broker_complaints','community_badges','complaints','visit_requests','property_reports','reviews','saved_searches','notifications','messages','favorites','properties','users','payments'];
const missing = toCheck.filter(x => !t.includes(x));
console.log(missing.length === 0 ? 'ALL TABLES EXIST' : 'MISSING: ' + missing.join(', '));
