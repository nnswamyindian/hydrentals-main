const Database = require('better-sqlite3');
const db = new Database(':memory:');
db.exec('CREATE TABLE test (id INTEGER, name TEXT, val TEXT)');
const stmt = db.prepare('INSERT INTO test (id, name, val) VALUES (?, ?, ?)');
try {
  stmt.run([1, 'hello', 'world']);
  console.log("Array param worked!");
} catch(e) {
  console.log("Array param failed!", e.message);
}
