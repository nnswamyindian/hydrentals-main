import Database from 'better-sqlite3';

const db = new Database('./server/database.sqlite');
const users = db.prepare('SELECT id FROM users LIMIT 2').all();
console.log(users);

if (users.length >= 2) {
    (async () => {
        try {
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
                        content: 'Hello Real User'
                    }
                })
            });
            const data = await res.json();
            console.log("Insert result:", data);
        } catch (e) {
            console.error(e);
        }
    })();
} else {
    console.log("Not enough users to test messages");
}
