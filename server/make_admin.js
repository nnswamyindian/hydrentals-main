const db = require('./db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

(async () => {
    const email = 'info.hydrentals@gmail.com';
    const rawPassword = 'Royal@09870';

    try {
        // Check if exists
        const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
        let user = rows[0];

        if (user) {
            // Update existing user
            await db.execute("UPDATE users SET role = 'admin', is_verified = 1 WHERE email = ?", [email]);
            console.log(`Successfully upgraded existing account (${email}) to Admin! Email verification bypassed.`);
        } else {
            // Insert new user
            const id = crypto.randomUUID();
            const hash = await bcrypt.hash(rawPassword, 10);
            await db.execute(`
                INSERT INTO users (id, email, password_hash, full_name, role, is_verified) 
                VALUES (?, ?, ?, ?, ?, ?)
            `, [id, email, hash, 'BrainOvision Admin', 'admin', 1]);
            console.log(`Successfully created new Admin account (${email})! Email verification bypassed.`);
        }
    } catch (e) {
        console.error("Error running script:", e);
    } finally {
        process.exit();
    }
})();
