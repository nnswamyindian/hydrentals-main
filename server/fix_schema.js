const db = require('./db');
try { db.exec("ALTER TABLE messages RENAME COLUMN read TO is_read;"); } catch(e){}
try { db.exec("ALTER TABLE notifications RENAME COLUMN read TO is_read;"); } catch(e){}
console.log("Fixed is_read columns");
