# Extension Dependency Investigation — `pgcrypto`

**Date:** 2026-08-26
**Nature:** **INVESTIGATION ONLY.** No fix implemented. No migration added. No extension created in
the application database. All testing was performed on disposable databases, both destroyed.
**Purpose:** answer the eight questions required before an extension strategy is selected.

---

## 1. Summary

| Question | Answer |
|---|---|
| Does the target Supabase environment already provide `pgcrypto`? | **Yes — in this project.** But see §3: that is "it happens to exist", which is not sufficient evidence |
| Can our migration role create the extension? | **Yes — proven.** `postgres` (non-superuser) created it successfully |
| Is `pgcrypto` available on the target platform? | **Yes** — `pg_available_extensions` lists it, version 1.3 |
| Does `CREATE EXTENSION IF NOT EXISTS pgcrypto` need elevated privileges here? | **No** — it succeeded as the ordinary migration role |
| Already documented as a prerequisite anywhere? | **No** — nowhere in `implementation/`, `verity-spec/` or `CLAUDE.md` |
| Which functions depend on it? | **Three call sites, one file** — `pgp_sym_encrypt` ×2, `pgp_sym_decrypt` ×1 |
| Used only for credential encryption? | **Yes**, in application code. Plus `crypt`/`gen_salt` in the retiring dev seed |
| Portable to a client's dedicated database? | **Conditionally** — see §7 |
| Is `uuid-ossp` a Verity dependency? | **No — zero usage.** Do not add it |
| Is `pg_stat_statements` a Verity dependency? | **No — zero usage.** Platform observability only |

**Decisive evidence:** on a disposable database with all 22 migrations **plus** `pgcrypto`, the
workflow-runtime suite returns **14 passed, 0 failed** — including the three credential tests that
fail without it. The extension is the entire gap; nothing else about the credential path is wrong.

---

## 2. The dependency surface is small and precise

Exhaustive search across `prisma/migrations/`, `src/` and `prisma/seed.ts`:

| Function | Location | Status |
|---|---|---|
| `pgp_sym_encrypt` ×2 | `20260823090000_workflow_runtime/migration.sql:254,256` — `verity.credential_store` | **Application runtime dependency** |
| `pgp_sym_decrypt` ×1 | `20260823090000_workflow_runtime/migration.sql:282` — `verity.credential_reveal` | **Application runtime dependency** |
| `crypt`, `gen_salt` | `prisma/seed.ts:45` | Development fixture only, **scheduled for removal** in Phase 2.5 |

**One correction to my earlier reporting.** `src/server/platform/files.ts:70` matched a grep for
`digest(`, but it is Node's `createHash(...).digest("hex")` — not pgcrypto. Application code has
**no** pgcrypto dependency outside those three SQL call sites.

`verity.credential_store` declares `SET search_path = public, verity, extensions, pg_temp`, so the
extension resolves whether it lives in `public` or `extensions`.

### `uuid-ossp` — NOT a dependency

`uuid_generate_v*`: **0 occurrences** anywhere. Five migration files use `gen_random_uuid()`, which
has been a **PostgreSQL core builtin since 13** and needs no extension. This cluster runs 17.6.

**Recommendation: do not add `uuid-ossp`.** It is present in the application database because
Supabase provisions it, not because Verity uses it. Adding it for list parity would be exactly the
mistake of treating environment furniture as an application requirement.

### `pg_stat_statements` — NOT a dependency

**0 occurrences** in `src/` or `prisma/`. It is query-performance observability supplied by the
platform.

**Recommendation: do not add it.** The fresh-database criterion must distinguish *required
application dependency* from *environment-provided operational tooling*, or it degrades into "every
extension on Supabase must exist everywhere".

---

## 3. Does Supabase provide it? — yes here, but that is not sufficient evidence

Observed on the application database: `pgcrypto` 1.3 installed in the **`extensions`** schema,
alongside `uuid-ossp`, `pg_stat_statements` and `supabase_vault`. `pg_available_extensions` reports
`pgcrypto` available at 1.3.

**But the fresh-database gate has already disproved this class of reasoning twice.** Both defects
found in 0.9 were "it happens to exist in the database we configured by hand". The correct standard
is the one already established:

> A required dependency is either created reproducibly by migration, **or** explicitly provisioned
> as a documented environment prerequisite. "It happens to exist on Supabase" is not evidence.

I can confirm this Supabase project has it. I cannot confirm from inside this repository that every
future Supabase project, at every future date, on every plan tier, will. That is precisely the
assumption that produced this defect.

---

## 4. Can the migration role create it? — proven yes

Tested on a disposable database (`verity_ext_probe`, since destroyed):

```
role: postgres                       (rolsuper=false, rolcreatedb=true, rolcreaterole=true)
extensions present: plpgsql
schema 'extensions' exists: false
CREATE EXTENSION IF NOT EXISTS pgcrypto  -> OK
installed at: [{"extname":"pgcrypto","sch":"public","extversion":"1.3"}]
pgp_sym_encrypt callable: {"works":true}
second CREATE EXTENSION IF NOT EXISTS    -> OK (no error, idempotent)
```

Three findings that matter:

1. **No superuser needed.** `pgcrypto` is a trusted extension in PostgreSQL 13+, so a database
   owner may create it. The migration role qualifies.
2. **`IF NOT EXISTS` is genuinely idempotent** — a second run is a clean no-op, so a migration
   carrying it is a no-op against the application database.
3. **On a fresh database the `extensions` schema does not exist**, so the extension lands in
   `public`. The application database has it in `extensions`. Both resolve through the credential
   function's `search_path`, but the two databases would then differ in extension *location* — a
   new, smaller divergence of the same family. See §6.

---

## 5. Decisive test — the extension is the whole gap

Disposable database, all 22 migrations from zero, `pgcrypto` created:

```
Test Files  1 passed (1)
Tests       14 passed (14)
```

Without `pgcrypto`: 11 passed, 3 failed. With it: 14 passed. Nothing else about credential storage
needs changing, which is strong evidence **against** option 3 (redesigning credential encryption) —
there is no defect in the design, only an undeclared dependency.

---

## 6. If migration-managed, these must be decided explicitly

| Question | Finding |
|---|---|
| Who creates it? | The migration role. Proven capable |
| Where does it live? | **Unresolved.** `public` on a fresh database; `extensions` on the application database. `WITH SCHEMA extensions` would **fail** on a fresh database, because that schema does not exist unless Supabase made it |
| Database-local? | **Yes.** Extensions are per-database, like grants. This is the same property that caused both 0.9 defects |
| Privileges required? | Database owner. No superuser, no elevated role |
| Must it pre-exist in managed environments? | No — but if it does, `IF NOT EXISTS` makes the migration a no-op |
| Survives backup/restore? | `pg_dump` emits `CREATE EXTENSION` for extensions it records, so a logical restore recreates it. A restore into an environment where the role cannot create extensions would fail at that statement |
| Do fresh client databases get it automatically? | **Only if migration-managed.** That is the entire question |

**Ordering constraint.** An extension migration must run **before**
`20260823090000_workflow_runtime`, or at least before any call. Prisma applies migrations in
filename order, so a new migration dated 2026-08-26 sorts *after* it. Function creation still
succeeds — PostgreSQL does not resolve called function names in a `plpgsql` body at `CREATE`
time — so a late migration works in practice, but it is fragile reasoning. A correctly ordered
migration, or one that also verifies the function is callable, is the sounder shape. **This needs a
decision, not an assumption.**

---

## 7. Portability to a client's dedicated database

| Target | `CREATE EXTENSION pgcrypto` |
|---|---|
| Supabase (this and other projects) | **Works** — proven here; also usually pre-provisioned |
| Self-hosted PostgreSQL 13+ | **Works** if `postgresql-contrib` is installed. Trusted extension, database owner suffices |
| AWS RDS / Aurora | **Works** — `pgcrypto` is on the supported list; `rds_superuser` creates it |
| Google Cloud SQL / Azure Flexible Server | **Works** — supported, sometimes requires allow-listing the extension first |
| A locked-down managed instance with an extension allow-list | **May fail.** The migration would abort mid-history |

`pgcrypto` is about as portable as a PostgreSQL extension gets. The residual risk is not
availability but **permission policy** in a hardened environment — which is an argument for the
migration failing *loudly and early* with a clear message, rather than for avoiding the migration.

---

## 8. Options, with assessment — NOT SELECTED

### Option 1 — Declare it in migration history *(the direction you asked to be evaluated first)*

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

- **Evidence: viable.** Proven creatable by the migration role, idempotent, and sufficient to turn
  14/14 green.
- Puts the dependency in version control where the schema and (since F1) the privileges already are.
- No-op against the application database.
- **Open sub-decisions:** target schema (§6), migration ordering (§6), and behaviour in an
  environment that forbids extension creation.
- **Assessment: strongest candidate.** It is the same remedy as F1, applied to the same class of
  defect, and it is consistent with the principle already adopted.

### Option 2 — Documented environment prerequisite

Provision `pgcrypto` alongside role creation, as a documented step.

- Honest, and correct for environments where migrations genuinely may not create extensions.
- But it leaves the repository unable to produce a working database on its own — which is what F3
  was rejected for in the grants defect. Accepting it here would apply two different standards to
  one problem.
- **Assessment: the fallback if, and only if, Option 1 proves unsafe for the deployment model.**

### Option 3 — Move credential encryption off pgcrypto

- **Assessment: not warranted by the evidence.** §5 shows the credential design is correct and the
  extension is the whole gap. This would be a significant architectural change adopted to make a
  test green — explicitly what you ruled out.

---

## 9. What was NOT done

- No migration written or added.
- No extension created in the application database.
- No test skipped, mocked, weakened or altered. The three credential tests remain exactly as
  written and still fail on a fresh database without `pgcrypto`.
- No credential-encryption redesign.
- Both disposable databases destroyed; 0 copies remain. Application database verified at 22
  migrations, 52 tables, 51 grants.

## 10. Awaiting authorization

1. **Option 1, 2, or 3.**
2. If Option 1: **which schema** the extension targets, and **how ordering** is handled (§6).
3. Confirmation that `uuid-ossp` and `pg_stat_statements` are **excluded** as non-dependencies, and
   that the 0.9 extension criterion is *required application dependencies only* rather than
   extension-list parity with Supabase.

**Phase 0.9 remains FAIL. Phase 0 remains INCOMPLETE. Nothing downstream has been started.**
