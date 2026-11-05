import os
import re
import secrets

env_file = ".env"
content = ""

if os.path.exists(env_file):
    with open(env_file, "r", encoding="utf-8") as f:
        content = f.read()
elif os.path.exists(".env.example"):
    with open(".env.example", "r", encoding="utf-8") as f:
        content = f.read()

db_password = secrets.token_hex(16)
root_password = secrets.token_hex(16)

if re.search(r"^DB_PASSWORD=.*", content, flags=re.MULTILINE):
    content = re.sub(r"^DB_PASSWORD=.*", f"DB_PASSWORD={db_password}", content, flags=re.MULTILINE)
else:
    content += f"\nDB_PASSWORD={db_password}"

if re.search(r"^DB_ROOT_PASSWORD=.*", content, flags=re.MULTILINE):
    content = re.sub(r"^DB_ROOT_PASSWORD=.*", f"DB_ROOT_PASSWORD={root_password}", content, flags=re.MULTILINE)
else:
    content += f"\nDB_ROOT_PASSWORD={root_password}"

with open(env_file, "w", encoding="utf-8") as f:
    f.write(content)

print(f"[gen-env] Generated {env_file} with secure random passwords.")
