const db = require('./db');
try {
  db.exec("ALTER TABLE users ADD COLUMN verification_token TEXT;");
  console.log("Successfully added verification_token column");
} catch(e) {
  console.log("Column may already exist:", e.message);
}
