let content = "const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(targetEmail);\n" +
    "let existingPhone = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);\n" +
    "db.prepare(`INSERT ...`).run(id, targetEmail);\n" +
    "user = db.prepare('SELECT *').get(email);\n" +
    "const user = db.prepare('...').get(id);\n";

console.log("Original:\n", content);

content = content.replace(/(?:(const|let|var)\s+)?([a-zA-Z0-9_]+)\s*=\s*db\.prepare\(([`'"])([\s\S]*?)\3\)\s*\.get\((.*?)\)/g, (match, keyword, varName, quote, query, args) => {
    let kw = keyword ? keyword + " " : "";
    return `${kw}[${varName}_rows] = await db.execute(${quote}${query}${quote}${args.trim() ? `, [${args}]` : ''});\n${kw ? "" : varName + " = "}${kw ? "const " + varName + " = " : ""}${varName}_rows[0]`;
});

content = content.replace(/db\.prepare\(([`'"])([\s\S]*?)\1\)\s*\.run\((.*?)\)/g, (match, quote, query, args) => {
    return `await db.execute(${quote}${query}${quote}${args.trim() ? `, [${args}]` : ''})`;
});

console.log("Replaced:\n", content);
