const Database = require('better-sqlite3');
const db = new Database('./server/database.sqlite');
const users = db.prepare('SELECT id FROM users LIMIT 2').all();

(async () => {
    if (users.length >= 2) {
        try {
            console.log("Sending POST to /api/rest with:", users[0].id, users[1].id);
            const res = await fetch('http://localhost:3000/api/rest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    table: 'messages',
                    action: 'insert',
                    payload: {
                        sender_id: users[0].id,
                        receiver_id: users[1].id,
                        property_id: null,
                        content: 'Hello API Test'
                    }
                })
            });
            const data = await res.json();
            console.log("Response:", JSON.stringify(data, null, 2));
        } catch (e) {
            console.error(e);
        }
    }
})();
