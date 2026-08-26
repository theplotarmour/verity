# Staging Environment Runbook — Verity Staging Supabase

**Status:** PREPARED — execution blocked on one manual step only (project creation).
**Purpose:** a dedicated staging Supabase project receiving Vercel Preview traffic, with the
complete migration history applied and runtime verified. No production data is ever copied.
**Approved topology (product owner):**

```
Vercel Preview → Staging Supabase → complete migration history → verity_app → RLS-enforced runtime
```

---

## Hard rules

1. The **production** Supabase project (`ygkjidaggwvhjgpqlkmj`) is **never** a Preview backend.
2. No production data, no production credentials, no production connection strings move to staging.
3. Staging gets its own `verity_app` credential, generated at provisioning time.
4. Runtime connections use `verity_app` (`NOSUPERUSER NOBYPASSRLS`) — never `postgres`, never any
   BYPASSRLS role (INV-001 fails open otherwise; see CLAUDE.md role contract).
5. Secrets live in Vercel/Supabase stores only. Nothing here records a password.

## Step 1 — Create the project *(the one manual step)*

Either dashboard: new Supabase project named **`verity-staging`**, same region as production
(`ap-south-1`), or Management API with a personal access token:

```bash
curl -X POST "https://api.supabase.com/v1/projects" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"verity-staging","organization_id":"<org-id>","region":"ap-south-1",
       "db_pass":"<generated-at-runtime>"}'
```

The read-only project-pinned MCP cannot do this by design; that boundary stays.

## Step 2 — Provision the runtime role (before migrating)

Each Supabase project is its own cluster: `verity_app` does not exist there. It MUST exist before
`prisma migrate deploy`, because `20260826000000_runtime_role_privileges` skips gracefully (NOTICE,
no grants) when the role is absent — silently leaving staging without working privileges.

Connect with the project's DIRECT connection (pooler, port 5432 session mode, database `postgres`)
and run:

```sql
CREATE ROLE verity_app LOGIN PASSWORD '<generated-at-provisioning>'
  NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
```

Generate the password in the terminal (`openssl rand -base64 24`), paste directly into the psql
session, never echo it into a file or this repository.

## Step 3 — Apply the migration history

From the repository root, with both URLs pointed at staging (database name swapped on the same
host/credential pattern as production):

```bash
DATABASE_URL='<staging verity_app pooled URL>' \
DIRECT_URL='<staging postgres URL>' \
npx prisma migrate deploy
```

Expected: all 23 migrations apply, first line
`Applying migration '20260822000000_required_extensions'`.

## Step 4 — Verify (same bar as Phase 0.9)

Run `tmp-09-rerun.mts` logic against staging instead of a disposable DB — i.e. confirm:

| Check | Expected |
|---|---|
| Migrations | 23 / 0 unfinished / 0 rolled back |
| Structure | 52 tables, 23 `verity.*` functions, RLS 51/51 forced, 62 policies, 151 indexes, 10 triggers |
| Grants | 51 tables granted to `verity_app`; `_prisma_migrations` NOT granted |
| Default ACLs | `{verity_app=arwd/postgres}` / `{verity_app=rU/postgres}` |
| Extensions | `pgcrypto` present; `uuid-ossp`/`pg_stat_statements` not required |
| Runtime | no-scope read fails closed; scoped CRUD OK; cross-tenant write rejected 42501; credential round-trip; wrong key raises 39000 |

## Step 5 — Wire Vercel Preview

```bash
vercel env add DATABASE_URL preview    # staging verity_app pooled URL
vercel env add DIRECT_URL preview      # staging postgres URL
```

Preview deploys then hit staging only. Production deployment env stays untouched until separately
authorized.

## Rollback / teardown

Staging is disposable by design: pause/delete the Supabase project and `vercel env rm` the two
Preview variables. Nothing in production is touched at any step.
