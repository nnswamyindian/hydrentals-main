const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
    const filePath = path.join(routesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // router.get/post/put/delete that are not async
    content = content.replace(/(router\.(?:get|post|put|delete)\([^,]+(?:,\s*[\w]+)?,\s*)\((req,\s*res)\)\s*=>/g, '$1async ($2) =>');

    // assignment .get(args)
    content = content.replace(/(?:(const|let|var)\s+)?([a-zA-Z0-9_]+)\s*=\s*db\.prepare\(([`'"])([\s\S]*?)\3\)\s*\.get\((.*?)\)/g, (match, keyword, varName, quote, query, args) => {
        let kw = keyword ? keyword + " " : "";
        let cleanArgs = args.trim();
        let argsArray = cleanArgs ? `, [${cleanArgs}]` : "";
        return `${kw}[${varName}_rows] = await db.execute(${quote}${query}${quote}${argsArray});\n    ${kw ? "const " : ""}${varName} = ${varName}_rows[0]`;
    });

    // assignment .all(args)
    content = content.replace(/(?:(const|let|var)\s+)?([a-zA-Z0-9_]+)\s*=\s*db\.prepare\(([`'"])([\s\S]*?)\3\)\s*\.all\((.*?)\)/g, (match, keyword, varName, quote, query, args) => {
        let kw = keyword ? keyword + " " : "";
        let cleanArgs = args.trim();
        let argsArray = cleanArgs ? `, [${cleanArgs}]` : "";
        return `${kw}[${varName}] = await db.execute(${quote}${query}${quote}${argsArray})`;
    });

    // .run(args)
    content = content.replace(/db\.prepare\(([`'"])([\s\S]*?)\1\)\s*\.run\((.*?)\)/g, (match, quote, query, args) => {
        let cleanArgs = args.trim();
        let argsArray = cleanArgs ? `, [${cleanArgs}]` : "";
        return `await db.execute(${quote}${query}${quote}${argsArray})`;
    });

    // inline .get(args)
    content = content.replace(/db\.prepare\(([`'"])([\s\S]*?)\1\)\s*\.get\((.*?)\)/g, (match, quote, query, args) => {
        let cleanArgs = args.trim();
        let argsArray = cleanArgs ? `, [${cleanArgs}]` : "";
        return `(await db.execute(${quote}${query}${quote}${argsArray}))[0][0]`;
    });

    // inline .all(args)
    content = content.replace(/db\.prepare\(([`'"])([\s\S]*?)\1\)\s*\.all\((.*?)\)/g, (match, quote, query, args) => {
        let cleanArgs = args.trim();
        let argsArray = cleanArgs ? `, [${cleanArgs}]` : "";
        return `(await db.execute(${quote}${query}${quote}${argsArray}))[0]`;
    });

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Processed ' + file);
});
