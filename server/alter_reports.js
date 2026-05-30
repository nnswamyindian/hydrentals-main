const db = require('./db');
try {
  db.exec("ALTER TABLE property_reports ADD COLUMN description TEXT;");
  console.log("Successfully added description column to property_reports");
} catch(e) {
  console.log("Column may already exist:", e.message);
}
