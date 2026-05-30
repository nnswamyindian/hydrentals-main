const Database = require('better-sqlite3');
const db = new Database('./server/database.sqlite');
const msgs = db.prepare('SELECT * FROM messages ORDER BY created_at DESC LIMIT 5').all();
console.log(msgs);
