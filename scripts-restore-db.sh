#!/usr/bin/env bash
# One-shot: set the verity_app password in .env, verify it, then bring the
# hosted database up to the repository's migration state.
#
#   ./scripts-restore-db.sh '<password from your friend>'
#
# The password is passed as an argument and written straight into .env — it is
# never echoed. Delete this script afterwards; it exists for one use.
set -euo pipefail
cd "$(dirname "$0")"

PW="${1:-}"
[ -n "$PW" ] || { echo "usage: ./scripts-restore-db.sh '<verity_app password>'" >&2; exit 1; }

python3 - "$PW" <<'PY'
import re, sys, urllib.parse
pw = urllib.parse.quote(sys.argv[1], safe='')
s = open('.env').read()
def swap(line):
    # Replace only the password segment of the DATABASE_URL, leaving host,
    # port, user and query string exactly as they are.
    return re.sub(r'(postgresql://[^:@/]+):[^@]*@', r'\1:' + pw + '@', line)
out = []
for line in s.splitlines(keepends=True):
    out.append(swap(line) if line.startswith('DATABASE_URL=') else line)
open('.env','w').write(''.join(out))
print('DATABASE_URL password updated')
PY

echo "verifying verity_app..."
node - <<'JS'
process.loadEnvFile('.env');
const { PrismaClient } = await import('@prisma/client');
const p = new PrismaClient();
const r = await p.$queryRaw`SELECT current_user, current_setting('TimeZone') AS tz`;
console.log('connected as', JSON.stringify(r));
const [role] = await p.$queryRaw`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`;
if (role.rolsuper || role.rolbypassrls) { console.error('REFUSING: runtime role bypasses RLS (INV-001)'); process.exit(1); }
console.log('RLS enforceable: yes');
await p.$disconnect();
JS

echo "applying pending migrations..."
npx prisma migrate deploy

echo "running the suite against the hosted database..."
npm run test
