# Phase 0.9 — Rerun after F1 remediation

**Date:** 2026-08-26
**Change made:** F1 only — one new migration, `20260826000000_runtime_role_privileges`.
**Result:** **The authorized defect is FIXED and verified. 0.9 remains FAIL for a second, distinct
defect that F1 was not authorized to touch.**

---

## 1. Verdict

> **F1 worked.** Privileges are now fully reproducible: a database built from migrations alone is
> byte-for-byte identical to the verified application database on every privilege property, and the
> runtime role performs real reads, writes, updates, deletes and function calls with RLS enforcing
> isolation correctly.
>
> **A second reproducibility gap surfaced during the acceptance suite.** The migration history does
> not declare its **PostgreSQL extension dependency**. `pgcrypto` exists in the application database
> because Supabase provisioned it, not because Verity's migrations ask for it. On a fresh database
> it is absent, and the encrypted credential registry (MET-AUT-003) does not work.

Same class of defect as the grants, found the same way: state present in the hand-configured
database, absent from version control.

---

## 2. Exact migration change

One file added. No existing migration edited. No source file, schema, policy or role attribute
changed.

```
prisma/migrations/20260826000000_runtime_role_privileges/migration.sql
```

A single idempotent `DO $$ … $$` block that:

1. **Returns early with a NOTICE if `verity_app` does not exist.** No `CREATE ROLE`. Role
   provisioning stays outside the migration system, as the architecture requires — the role is a
   cluster object and its credentials are an environment concern.
2. Grants `USAGE` (never `CREATE`) on schemas `public` and `verity`.
3. Grants `SELECT, INSERT, UPDATE, DELETE` on public tables **one at a time**, excluding
   `_prisma_migrations`. A blanket `ON ALL TABLES` would have swept migration bookkeeping in.
4. Grants `SELECT, USAGE` on sequences in `public` (none exist today; the application database
   carries the rule, so reproducing it stops a future serial column reopening this defect).
5. Grants `EXECUTE` on all functions in schema `verity`.
6. Sets `ALTER DEFAULT PRIVILEGES` **FOR ROLE `current_user`** — the role that actually owns the
   objects the migrations create — for tables and sequences in `public`.

On the grantor: `ALTER DEFAULT PRIVILEGES` applies per grantor, so a rule set for role X governs
only objects X creates. Hard-coding `postgres` would silently do nothing in an environment that
migrates as another role, so the owner is taken from the session rather than assumed.

## 3. Exact grant / default-privilege change

Read from the verified application database first, then reproduced — not chosen:

| Object | Privilege | Source of truth |
|---|---|---|
| `public` tables (51) | `SELECT, INSERT, UPDATE, DELETE` | app DB ACL `verity_app=arwd/postgres` |
| `_prisma_migrations` | **none** | app DB: the one ungranted table |
| `public` sequences | `SELECT, USAGE` | app DB default ACL `verity_app=rU/postgres` |
| schema `public` | `USAGE` only | app DB `verity_app=U/pg_database_owner` |
| schema `verity` | `USAGE` only | app DB `verity_app=U/postgres` |
| `verity` functions (23) | `EXECUTE` | app DB `verity_app=X/postgres` on all 23 |
| default, tables | `SELECT, INSERT, UPDATE, DELETE` | app DB `public:r:verity_app=arwd/postgres` |
| default, sequences | `SELECT, USAGE` | app DB `public:S:verity_app=rU/postgres` |

**Nothing was widened.** No role created, no role attribute altered, no `SUPERUSER`, no
`BYPASSRLS`, no role membership, no RLS disabled, no policy changed, no ownership changed,
`_prisma_migrations` not granted, no `CREATE` on any schema, no application authorization logic
touched.

## 4. Fresh migration result

Disposable database created **empty** — verified 0 tables before migrating.

```
tables before migrating: 0
Applying migration `20260826000000_runtime_role_privileges`
All migrations have been successfully applied.
```

All 22 migrations applied from zero. None skipped, edited or patched.

| Property | Application DB | Fresh DB | Match |
|---|---|---|---|
| Public tables | 52 | 52 | ✅ identical set |
| `verity.*` functions | 23 | 23 | ✅ identical set |
| RLS enabled / forced | 51 / 51 | 51 / 51 | ✅ |
| Policies | 62 | 62 | ✅ |
| Indexes | 151 | 151 | ✅ |
| Triggers | 10 | 10 | ✅ |
| **Tables granted to `verity_app`** | **51** | **51** | ✅ **FIXED** |
| **Privilege set** | `DELETE,INSERT,SELECT,UPDATE` | `DELETE,INSERT,SELECT,UPDATE` | ✅ **FIXED** |
| **`_prisma_migrations` granted** | 0 | 0 | ✅ correctly excluded |
| Schema `public` / `verity` USAGE | true / true | true / true | ✅ |
| Schema `public` / `verity` CREATE | false / false | false / false | ✅ correctly withheld |
| **Default ACLs** | `public:S:verity_app=rU/postgres`, `public:r:verity_app=arwd/postgres` | **identical strings** | ✅ **FIXED** |
| Function `EXECUTE` grants | 23 | 23 | ✅ **FIXED** |
| Role attributes | `rolsuper=false, rolbypassrls=false, rolcanlogin=true` | **identical** | ✅ |
| Migrations applied / unfinished / rolled back | 21 / 0 / 0 | 22 / 0 / 0 | ✅ (+1 = the new one) |

**Every privilege property now reproduces exactly. No manual `GRANT` is required after migration.**

## 5. Runtime-role verification

Connected as `verity_app` to the freshly migrated database:

| # | Operation | Result |
|---|---|---|
| 1 | `SELECT` with **no** tenant scope | **0 rows** — fails closed ✅ |
| 2 | `INSERT` tenant + `SELECT` in scope A | 1 row ✅ |
| 3 | `INSERT` organization (child entity) in scope A | 1 row ✅ |
| 4 | `UPDATE` in scope A | value changed ✅ |
| 5 | **Isolation** — scoped to tenant B, tenant A data visible | **0 tenants, 0 orgs** ✅ |
| 6 | **Cross-tenant write** — insert tenant A row while scoped to B | **rejected, SQLSTATE 42501** ✅ |
| 7 | `DELETE` in scope A | 0 rows remain ✅ |
| 8 | `EXECUTE verity.is_valid_timezone` | `true` ✅ |

The `permission denied for table tenant` failure that defined the original defect is gone, and RLS
is enforcing isolation on the fresh database exactly as it does on the application database.

## 6. Test results

**Against the fresh database:**

```
Test Files  1 failed | 20 passed (21)
Tests       3 failed | 288 passed (291)
```

All three failures are in `src/test/workflow-runtime.test.ts`, all three are the credential
encryption tests:

- `round-trips an encrypted credential (MET-AUT-003)`
- `stores the secret as ciphertext, not plaintext`
- `does not reveal a credential under the wrong key` — *"promise resolved null instead of rejecting"*

**Against the application database (regression check):**

```
Test Files  21 passed (21)
Tests       291 passed (291)
```

**No regression.** F1 introduced nothing that breaks the existing database, and the new migration is
a no-op there by design.

## 7. The second defect — NOT FIXED, not authorized

| Database | Extensions |
|---|---|
| Application | `pgcrypto@extensions`, `uuid-ossp@extensions`, `pg_stat_statements@extensions`, `supabase_vault@vault`, `plpgsql` |
| Fresh | **`plpgsql` only** |

`verity.credential_store` (migration `20260823090000_workflow_runtime`) declares
`SET search_path = public, verity, extensions, pg_temp` and calls `pgp_sym_encrypt` — a **pgcrypto**
function. No migration contains `CREATE EXTENSION`. `pgcrypto` exists in the application database
because **Supabase provisioned it**, not because Verity asked for it.

Consequences:

- On a fresh database the encrypted credential registry **does not work**, so **MET-AUT-003 is not
  satisfied by the migration history**.
- The third failure is the one worth noting: with pgcrypto absent, the wrong-key reveal path
  **returns null instead of raising**. Nothing can be stored either, so no secret leaks in practice
  — but a security test that expects a rejection and gets a silent `null` is exactly the shape a
  reproducibility gap should never be allowed to take.
- The same reasoning applies to `uuid-ossp` and to `gen_random_uuid()`; the latter is a PostgreSQL
  13+ builtin and is safe, but the dependency has never been stated either way.

**Not fixed.** The instruction was to implement F1 only. Declaring an extension dependency is a
separate change with its own considerations — which extensions, in which schema, and whether the
migration role is permitted to create them in every target environment (on managed platforms it
often is not).

## 8. Criterion-by-criterion

| # | Required | Result |
|---|---|---|
| 1 | Empty disposable database | ✅ verified 0 tables before |
| 2 | All 21 + new migration from zero | ✅ 22 applied |
| 3 | No manual patching | ✅ |
| 4 | All migrations complete | ✅ 22 / 0 unfinished / 0 rolled back |
| 5 | Complete schema | ✅ 52 tables, identical set |
| 6 | RLS | ✅ 51 enabled, 51 forced |
| 7 | Policies | ✅ 62 |
| 8 | Functions | ✅ 23, identical set |
| 9 | Indexes | ✅ 151 |
| 10 | Triggers | ✅ 10 |
| 11 | **Grants** | ✅ **51 / 51 — FIXED** |
| 12 | Schema `USAGE` | ✅ both, `CREATE` correctly withheld |
| 13 | **Default privileges** | ✅ **identical — FIXED** |
| 14 | `verity_app` authenticates | ✅ |
| 15 | Representative runtime operations | ⚠️ **PARTIAL** — CRUD, isolation and function execution all pass; credential store/reveal fails on the missing extension |
| 16 | Database-backed acceptance suite | ❌ **288 / 291** |
| 17 | Disposable database destroyed | ✅ 0 copies remain; application DB verified intact at 52 tables, 51 grants, 21 migrations |

## Verdict

# PHASE 0.9: FAIL

**The authorized defect is fixed and proven.** Privileges reproduce exactly, no manual `GRANT` is
needed, and the runtime role operates correctly under RLS on a fresh database.

**0.9 cannot pass** because criterion 16 fails: the acceptance suite does not pass against a fresh
database, for a second and previously unknown reason — an undeclared PostgreSQL extension
dependency. Per the acceptance rule, a fresh database that is not fully operationally usable by the
runtime role is a FAIL, and it is reported as one.

## Outstanding decisions

1. **Extension dependency (blocks 0.9).** Options: a migration declaring
   `CREATE EXTENSION IF NOT EXISTS pgcrypto`; provisioning extensions as a documented environment
   step alongside role creation; or moving credential encryption off pgcrypto. Each has different
   implications on managed platforms where the migration role may not be permitted to create
   extensions. **Needs authorization before anything is written.**
2. **Deploy the F1 migration to the application database.** It is currently applied only to the
   disposable database; the application database sits at 21 of 22. The migration is a verified
   no-op there, but the divergence should not be left open.
3. **Permanent verification principle** (recorded per instruction): *a migration sequence is not
   healthy merely because it applies successfully — a fresh database must also be operationally
   usable by the runtime role.* Both defects found today were invisible to "did migrations finish?"
   and visible immediately to "can the runtime role actually use the result?". This belongs in
   Phase 3 as a permanent check rather than something rediscovered at first client deployment.
