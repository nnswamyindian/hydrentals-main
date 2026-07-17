import os
import re

routes_dir = os.path.join(os.path.dirname(__file__), 'routes')
files = [f for f in os.listdir(routes_dir) if f.endswith('.js')]

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Make routers async
    content = re.sub(
        r'(router\.(?:get|post|put|delete)\([^,]+(?:,\s*[\w]+)?,\s*)\((req,\s*res)\)\s*=>',
        r'\1async (\2) =>',
        content
    )

    # 1. Assignment .get() -> var = db.prepare(...).get()
    def repl_get(m):
        kw, var = m.group(1), m.group(2)
        query = f"{m.group(3)}{m.group(4)}{m.group(3)}"
        args = m.group(5).strip()
        args_array = f", [{args}]" if args else ""
        
        prefix = f"{kw} " if kw else ""
        return f"{prefix}[{var}_rows] = await db.execute({query}{args_array});\n    {'const ' if kw else ''}{var} = {var}_rows[0];"
    
    content = re.sub(
        r'(const|let|var)?\s*(\w+)\s*=\s*db\.prepare\((["\'`])(.*?)\3\)\.get\(([^)]*)\);?',
        repl_get,
        content,
        flags=re.DOTALL
    )

    # 2. Assignment .all() -> var = db.prepare(...).all()
    def repl_all(m):
        kw, var = m.group(1), m.group(2)
        query = f"{m.group(3)}{m.group(4)}{m.group(3)}"
        args = m.group(5).strip()
        args_array = f", [{args}]" if args else ""
        
        prefix = f"{kw} " if kw else ""
        return f"{prefix}[{var}] = await db.execute({query}{args_array});"
    
    content = re.sub(
        r'(const|let|var)?\s*(\w+)\s*=\s*db\.prepare\((["\'`])(.*?)\3\)\.all\(([^)]*)\);?',
        repl_all,
        content,
        flags=re.DOTALL
    )

    # 3. .run() -> db.prepare(...).run()
    def repl_run(m):
        query = f"{m.group(1)}{m.group(2)}{m.group(1)}"
        args = m.group(3).strip()
        args_array = f", [{args}]" if args else ""
        return f"await db.execute({query}{args_array});"
    
    content = re.sub(
        r'db\.prepare\((["\'`])(.*?)\1\)\.run\(([^)]*)\);?',
        repl_run,
        content,
        flags=re.DOTALL
    )

    # 4. Inline .get() -> db.prepare(...).get()
    def repl_inline_get(m):
        query = f"{m.group(1)}{m.group(2)}{m.group(1)}"
        args = m.group(3).strip()
        args_array = f", [{args}]" if args else ""
        return f"(await db.execute({query}{args_array}))[0][0]"
    
    content = re.sub(
        r'db\.prepare\((["\'`])(.*?)\1\)\.get\(([^)]*)\)',
        repl_inline_get,
        content,
        flags=re.DOTALL
    )

    # 5. Inline .all() -> db.prepare(...).all()
    def repl_inline_all(m):
        query = f"{m.group(1)}{m.group(2)}{m.group(1)}"
        args = m.group(3).strip()
        args_array = f", [{args}]" if args else ""
        return f"(await db.execute({query}{args_array}))[0]"
    
    content = re.sub(
        r'db\.prepare\((["\'`])(.*?)\1\)\.all\(([^)]*)\)',
        repl_inline_all,
        content,
        flags=re.DOTALL
    )

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Refactored {os.path.basename(file_path)}")

for f in files:
    process_file(os.path.join(routes_dir, f))
