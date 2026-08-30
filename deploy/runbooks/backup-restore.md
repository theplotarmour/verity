# Verity — Backup and Restore Runbook

Operator-facing. Every command here was run, in this exact form, against the
live development database on 2026-08-30 as part of proving this runbook —
see `taskplans/33_backup_restore_verification.md` for the full evidence
(row-by-row and count-by-count comparison, exact errors hit and how they
were resolved). This is not a design document; it is the procedure to
actually follow.

No automation script exists here on purpose. Run these commands directly,
read what they print, and decide from there — a wrapper script would be one
more thing to trust blindly during an incident.

---

## 0. What this backs up, and what it deliberately does not

**Backs up: application data only** (`--data-only`, schema `public`).
**Does NOT back up: schema, RLS policies, roles, or grants.**

This is a deliberate design choice, not an oversight — verified, not
assumed:

- **Schema is already reproducible from an empty database** — that is the
  entire point of `taskplans/31_migration_and_bootstrap.md`. A schema-
  carrying backup would be a second, parallel source of truth for table
  structure that can silently drift from the migration history. `prisma
  migrate deploy` is the schema authority; this runbook does not duplicate
  it.
- **`pg_dump` never captures roles, under any flag.** Roles (`verity_app`,
  `postgres`) are cluster-level objects, not database-level ones — only
  `pg_dumpall --globals-only` touches them, a different tool for a
  different scope. If your restore target is a genuinely fresh PostgreSQL
  cluster (not just a fresh database on an existing one), `verity_app` will
  not exist until you create it — see Step 2.
- **RLS policies and grants are schema objects**, created by migration
  `20260826000000_runtime_role_privileges` and the `CREATE POLICY`
  statements throughout the history. A data-only restore never touches
  them; they are already correct on any target that has been migrated.

The restore sequence below is therefore always: **migrate first, restore
data second** — never the reverse, and never a restore into an unmigrated
database.

---

## 1. Backup

Run as the **migration role** (`DIRECT_URL`), never `verity_app`
(`DATABASE_URL`) — `verity_app` cannot see other tenants' rows under RLS,
so a backup taken as it would be silently incomplete, not merely slow.

```bash
pg_dump "$DIRECT_URL" \
  --data-only \
  --format=custom \
  --schema=public \
  --exclude-table=public._prisma_migrations \
  --exclude-table=public.capability_definition \
  --exclude-table=public.entity_definition \
  --exclude-table=public.state_definition \
  --exclude-table=public.transition_definition \
  --exclude-table=public.config_parameter \
  --file=verity-data-$(date +%Y%m%d-%H%M%S).dump
```

**Why these six tables are excluded** (confirmed by actually hitting the
failure each one causes, not reasoned from the schema alone — see the
taskplan for the exact errors):

| Table | Why excluded |
|---|---|
| `_prisma_migrations` | Prisma's own migration ledger. The restore target has its own, correct one from its own `migrate deploy` run — restoring the source's would be redundant at best, confusing at worst. |
| `capability_definition`, `entity_definition`, `state_definition`, `transition_definition` | 100% migration-seeded static platform metadata (confirmed: no application code anywhere calls `.create()`/`.upsert()` on any of them — only `prisma/migrations/*/migration.sql`'s own `INSERT` statements do). Restoring them collides on primary key with the rows migration already created on the target — proven: attempting it produces `duplicate key value violates unique constraint "capability_definition_pkey"`. |
| `config_parameter` | **Mixed table** — see Step 1a below. Excluded from the main dump and handled separately, not because it holds no real data (it does — real tenant configuration overrides), but because its migration-seeded Global-scope defaults are NOT protected by their own unique index against a data-only restore. |

**Neither `auth.*` nor `storage.*` need an `--exclude-schema` flag** — this
command already only touches `--schema=public`, so Supabase's own schemas
(`auth`, `storage`, `realtime`, `graphql`, `graphql_public`, `vault`,
`pgbouncer`, `extensions`) are never in scope to begin with. (Confirmed
present on the live project via `SELECT schema_name FROM
information_schema.schemata` — 29 schemas total, of which exactly two,
`public` and `verity`, are Verity's own. `verity` holds only 28 functions
and zero tables — nothing in it needs a data-only dump.)

### 1a. `config_parameter` — the one table that needs a second command

```bash
psql "$DIRECT_URL" -c "\copy (SELECT * FROM config_parameter WHERE tenant_id IS NOT NULL) TO 'config_parameter_tenant.csv' WITH (FORMAT csv, HEADER true)"
```

**Why**: `config_parameter` holds both migration-seeded platform defaults
(`tenant_id IS NULL`, `scope = 'Global'`) and genuine tenant-specific
overrides (`tenant_id IS NOT NULL`, `scope = 'Tenant'`). Backing up the
whole table and restoring it produces silent, undetected **duplicate**
Global-scope rows — proven: the unique index on `(tenant_id, key, scope,
scope_id)` does NOT stop this, because `tenant_id` and `scope_id` are both
`NULL` on every Global row, and in standard SQL `NULL` is never equal to
`NULL` — two Global rows for the same key are, to that index, two entirely
distinct values. A restore of the full table left a real duplicate
`verity.plywood.tax.cgst_rate_bp` Global row sitting in the target
database, and the row count comparison (source: 6, target: 9) is what
caught it, not a code review. Filtering to `tenant_id IS NOT NULL` backs up
only the genuinely non-reproducible part; the target's own migration
already correctly re-seeds the three Global defaults.

This is a real schema gap (that unique index does not do what its name
implies), named here rather than fixed — fixing it is a schema change,
outside this runbook's scope.

---

## 2. Restore

### 2a. Prerequisite: `verity_app` role exists on the target

- **Restoring onto the same Supabase project's cluster, or any existing
  Verity cluster**: nothing to do — `verity_app` is a cluster-level role
  and already exists.
- **Restoring onto a genuinely fresh PostgreSQL cluster** (disaster
  recovery to a new server, or Task 30's `docker-compose.yml` `db`
  service on first ever start): `deploy/db/init/01-create-app-role.sh`
  already creates it automatically the first time that container
  initializes an empty data volume. Confirm it exists before continuing:
  ```sql
  SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'verity_app';
  -- expect: verity_app | f | f
  ```
  If this returns no rows on a hand-built (non-Compose) fresh cluster, run
  the one statement `deploy/db/init/01-create-app-role.sh` runs:
  `CREATE ROLE verity_app LOGIN PASSWORD '<password>' NOSUPERUSER NOBYPASSRLS;`

### 2b. Migrate the target — schema first, always

```bash
DIRECT_URL="<target-direct-url>" DATABASE_URL="<target-direct-url>" \
  npx prisma migrate deploy
```

(`DATABASE_URL` is set to the same privileged URL here only because
`migrate deploy` itself needs it transiently for Prisma's own tooling —
the running application's real `DATABASE_URL` afterward is `verity_app`,
never this one. Verified all 41 migrations apply cleanly to a genuinely
empty database — see the taskplan.)

### 2c. Restore data

```bash
pg_restore \
  --dbname="$TARGET_DIRECT_URL" \
  --data-only \
  --no-owner \
  --no-privileges \
  verity-data-<timestamp>.dump
```

`--no-owner --no-privileges`: the dump was taken `--data-only`, so it never
contains `ALTER TABLE ... OWNER TO` or `GRANT` statements to begin with —
these flags are here for defense in depth, not because they were observed
doing anything on this dump.

**Do NOT add `--disable-triggers`** unless you have genuine PostgreSQL
superuser on the target (a real self-hosted cluster, not Supabase).
Confirmed: Supabase's `postgres` role is privileged but is *not*
`rolsuper`, and `--disable-triggers` needs real superuser to disable
PostgreSQL's own internal foreign-key trigger
(`RI_ConstraintTrigger_a_...`) — attempting it fails with `permission
denied: "RI_ConstraintTrigger_a_..." is a system trigger`, before a single
row loads. Plain `pg_restore --data-only` (no trigger flag) restores every
table correctly on its own, dependency order included — confirmed
end-to-end, including a table (`organization`) that pg_dump itself warns
has a circular self-referential foreign key. The warning is real; it did
not, in practice, block the restore.

**One table needs one extra step: `tenant_activation`.** It carries a
trigger, `tenant_activation_requires_dependencies`, whose validation query
references `capability_definition` without a schema qualifier. Recent
`pg_restore` versions set `search_path = ''` for the restore session as a
security default, so that unqualified reference fails with `relation
"capability_definition" does not exist` — a real, reproduced error, not a
hypothetical one. `tenant_activation` is an ordinary user table you own, so
disabling *this one, specific, non-system* trigger needs no elevated
privilege:

```sql
ALTER TABLE public.tenant_activation DISABLE TRIGGER tenant_activation_requires_dependencies;
```

Run the `pg_restore` command above (or, to restore only this one table if
you already ran it once and only this table failed:
`pg_restore --dbname="$TARGET_DIRECT_URL" --data-only --no-owner --no-privileges --table=tenant_activation verity-data-<timestamp>.dump`),
then re-enable:

```sql
ALTER TABLE public.tenant_activation ENABLE TRIGGER tenant_activation_requires_dependencies;
```

**If any other error appears**, `pg_restore` (run without
`--exit-on-error`, the default) continues past it and reports every
failure at the end (`pg_restore: warning: errors ignored on restore: N`) —
read that summary before declaring the restore complete. Do not assume a
"finished" exit means every table landed.

### 2d. Restore the tenant-scoped `config_parameter` rows

```bash
psql "$TARGET_DIRECT_URL" -c "\copy config_parameter (id, tenant_id, key, value, scope, scope_id, created_at, updated_at) FROM 'config_parameter_tenant.csv' WITH (FORMAT csv, HEADER true)"
```

---

## 3. Verify the restore

The strongest available check is a direct row-count comparison against the
source, table by table:

```sql
-- Run against BOTH source and target, diff the two outputs.
SELECT tablename, (xpath('/row/c/text()',
  query_to_xml(format('SELECT count(*) AS c FROM %I.%I', schemaname, tablename), false, true, '')))[1]::text::int AS n
FROM pg_tables WHERE schemaname = 'public'
  AND tablename NOT IN ('_prisma_migrations','capability_definition','entity_definition','state_definition','transition_definition')
ORDER BY tablename;
```

Every row should match exactly. (This is the exact check that caught the
`config_parameter` duplication bug above — it is not optional decoration.)

Then confirm the application itself agrees the database is usable:

```bash
curl -s http://<target-host>:3000/api/ready
# expect: {"status":"ready","checks":{"db":"ok"}}
```

(`/api/ready` — Task 32. Do not use `/api/health` for this; it deliberately
never touches the database and would return 200 regardless of whether the
restore worked at all.)

---

## 4. Recovery strategy for a failed restore

There is no rollback for a restore any more than there is for a migration
(`taskplans/31_migration_and_bootstrap.md`'s own documented position on
this — Prisma has no `down` migration, and neither `pg_dump`/`pg_restore`
offers one). If a restore goes wrong partway:

1.  **Stop.** Do not attempt to "fix forward" mid-restore by hand-editing
    rows — you no longer know the database's true state.
2.  The actual recovery is: drop the partially-restored target (or the
    fresh database/schema you created for it — never the source), start
    over from Step 2b with a clean target, and restore from the SAME
    backup file again. `pg_restore --data-only` is naturally re-runnable
    against a freshly re-migrated target (that is what "fresh" and
    "migrate first, restore second" mean here) — it is not re-runnable
    against a target it already partially populated, because you would hit
    the same primary-key collisions on every table that succeeded the
    first time.
3.  If the SOURCE database itself is the thing that failed (this runbook
    assumes the source is healthy and you are restoring elsewhere) — that
    is a different incident with a different runbook; this document backs
    up and restores data, it does not diagnose a production outage.

---

## 5. Limitations

- Proven against Supabase-hosted PostgreSQL 17 (this project's actual
  development database) using a genuinely separate, freshly-created target
  **database** on the same cluster (`CREATE DATABASE`), not a fresh schema
  within the same database — chosen deliberately: Prisma's models have no
  `@@schema` mapping, so isolating via schema would need a
  `?schema=` connection-string override on every command in this runbook,
  adding a whole extra layer of indirection to verify for no real gain
  over a fresh database, which is also more representative of an actual
  disaster-recovery target.
- **Not proven against Task 30's `docker-compose.yml` `db` service** — no
  Docker daemon was available. The role-handling guidance in Step 2a for
  that path is reasoned from reading `deploy/db/init/01-create-app-role.sh`
  directly, not from running it.
- Not proven against a genuinely fresh PostgreSQL *cluster* (only a fresh
  *database* on an existing, already-configured cluster) — the `verity_app`
  role already existed at the cluster level for every restore performed
  while proving this runbook, so Step 2a's "create it if missing" guidance
  is reasoned, not independently exercised end to end.
