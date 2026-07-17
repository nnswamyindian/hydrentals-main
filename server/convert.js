const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
    const filePath = path.join(routesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Convert handlers to async
    content = content.replace(/(router\.(?:get|post|put|delete)\([^,]+(?:,\s*[\w]+)?,\s*)\((req,\s*res)\)\s*=>/g, '$1async ($2) =>');

    // 1. replace var = db.prepare('...').get(...)
    content = content.replace(/(const|let|var)?\s*([\w]+)\s*=\s*db\.prepare\((['"`])([\s\S]*?)\3\)\.get\(([^)]*)\);?/g,
        (match, kw, varName, quote, query, args) => {
            const kwPrefix = kw ? kw + ' ' : '';
            const declPrefix = kw ? 'const ' : '';
            const arrayArg = args.trim() ? `, [${args}]` : '';
            return `${kwPrefix}[${varName}_rows] = await db.execute(${quote}${query}${quote}${arrayArg});\n    ${kw ? "" : `${varName} = `}${declPrefix}${varName} = ${varName}_rows[0];`;
        }
    );

    // 2. replace db.prepare('...').run(...)
    content = content.replace(/db\.prepare\((['"`])([\s\S]*?)\1\)\.run\(([^)]*)\);?/g,
        (match, quote, query, args) => {
            const arrayArg = args.trim() ? `, [${args}]` : '';
            return `await db.execute(${quote}${query}${quote}${arrayArg});`;
        }
    );

    // 3. replace inline db.prepare('...').get(...)
    content = content.replace(/db\.prepare\((['"`])([\s\S]*?)\1\)\.get\(([^)]*)\)/g,
        (match, quote, query, args) => {
            const arrayArg = args.trim() ? `, [${args}]` : '';
            return `(await db.execute(${quote}${query}${quote}${arrayArg}))[0][0]`;
        }
    );

    // 4. replace var = db.prepare('...').all(...)
    content = content.replace(/(const|let|var)?\s*([\w]+)\s*=\s*db\.prepare\((['"`])([\s\S]*?)\3\)\.all\(([^)]*)\);?/g,
        (match, kw, varName, quote, query, args) => {
            const kwPrefix = kw ? kw + ' ' : '';
            const arrayArg = args.trim() ? `, [${args}]` : '';
            return `${kwPrefix}[${varName}] = await db.execute(${quote}${query}${quote}${arrayArg});`;
        }
    );

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
});
