const db = require('./db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

(async () => {
    const email = 'info.hydrentals@gmail.com';
    const rawPassword = 'Royal@09870';
    
    // Check if exists
    let user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    
    if (user) {
        // Update existing user
        db.prepare("UPDATE users SET role = 'admin', is_verified = 1 WHERE email = ?").run(email);
        console.log(`Successfully upgraded existing account (${email}) to Admin! Email verification bypassed.`);
    } else {
        // Insert new user
        const id = crypto.randomUUID();
        const hash = await bcrypt.hash(rawPassword, 10);
        db.prepare(`
            INSERT INTO users (id, email, password_hash, full_name, role, is_verified) 
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, email, hash, 'BrainOvision Admin', 'admin', 1);
        console.log(`Successfully created new Admin account (${email})! Email verification bypassed.`);
    }
})();
