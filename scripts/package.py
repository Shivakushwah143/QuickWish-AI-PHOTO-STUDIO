"""Create a secret-free source archive from the repository root."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import re

root = Path(__file__).resolve().parents[1]
target = root.parent / 'quickwish-ai-photo-studio-complete.zip'
blocked_dirs = {'node_modules', 'dist', '.git', '.private', 'test-results', 'playwright-report'}
secrets = []
local_env = root / 'apps/api/.env'
if local_env.exists():
    for line in local_env.read_text().splitlines():
        if '=' not in line or line.startswith('#'):
            continue
        name, value = line.split('=', 1)
        if name in {'DATABASE_URL', 'DATABASE_DIRECT_URL', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'GROQ_API_KEY', 'ADMIN_PASSWORD_HASH'} and value.strip('"\''):
            secrets.append(value.strip('"\'').encode())
files = []
for p in sorted(root.rglob('*')):
    if not p.is_file():
        continue
    rel = p.relative_to(root)
    if any(part in blocked_dirs for part in rel.parts):
        continue
    if p.name.startswith('.env') and p.name != '.env.example':
        continue
    if p.name.startswith('.private') or p.suffix == '.zip':
        continue
    content = p.read_bytes()
    if any(secret in content for secret in secrets):
        raise SystemExit('Secret scan failed in an eligible source file; archive not created.')
    if re.search(rb'gsk_[A-Za-z0-9]{20,}|npg_[A-Za-z0-9]{12,}', content):
        raise SystemExit('Credential pattern detected; archive not created.')
    files.append((p, rel))
assert files and (root / 'bun.lock').is_file()
with ZipFile(target, 'w', ZIP_DEFLATED) as z:
    for path, relative in files:
        z.write(path, 'quickwish/' + relative.as_posix())
with ZipFile(target) as z:
    assert z.testzip() is None
    assert 'quickwish/apps/api/.env' not in z.namelist()
    assert 'quickwish/apps/api/.env.example' in z.namelist()
print(f'Archive PASS: {len(files)} files, {target.stat().st_size} bytes; secret scan PASS.')
print('SHA256: ' + hashlib.sha256(target.read_bytes()).hexdigest())
