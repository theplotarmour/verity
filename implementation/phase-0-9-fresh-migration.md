# Phase 0.9 — Fresh Database Migration Verification

**Date:** 2026-08-26
**Objective:** prove the complete migration history can create Verity's expected database state
from an empty database.
**Result:** **FAIL — one criterion.** Schema reproduces perfectly; **privileges do not.**

---

## 1. Verdict

> All 21 migrations apply cleanly to an empty database and reproduce the schema **exactly** —
> every table, function, policy, index and trigger. But the resulting database is **unusable by the
> runtime role**, because no migration grants anything to `verity_app`.
>
> A fresh Verity deployment built from the migration history alone would come up with complete
> structure and a runtime role that can read and write **nothing**.

Proof, as `verity_app` against the freshly migrated database:

```
ERROR: permission denied for table tenant        (SQLSTATE 42501)
```

This is precisely the class of defect 0.9 exists to catch, and it is invisible in the application
database — which works only because of a manual step applied outside the migration history.

---

## 2. Method

- A **disposable database** `verity_fresh_check` was created on the same PostgreSQL cluster via
  the `postgres` role (`rolcreatedb = true`). **The application database was never used as the
  "fresh" database and was never modified.**
- `npx prisma migrate deploy` ran the full history against it, with `DATABASE_URL` and
  `DIRECT_URL` overridden **for that command only**. `.env` was not edited.
- No migration was skipped, edited, patched or reordered for the test.
- The resulting state was compared against the application database.
- The disposable database was **destroyed** afterwards. Confirmed: `pg_database` copies = 0;
  application database intact at 52 tables and 51 grants.

Migrations were confirmed portable before running: **no `auth.*` references, no `CREATE EXTENSION`**
anywhere in the history. The `CREATE ROLE verity_app` and `GRANT` lines in
`20260823000000_init_tenancy` are **SQL comments**, not executable statements — see §4.

---

## 3. Results

```
All migrations have been successfully applied.
```

| Property | Application DB | Fresh DB | Match |
|---|---|---|---|
| Public tables | 52 | 52 | **identical set** — no table only in one |
| `verity.*` functions | 23 | 23 | **identical set** |
| RLS enabled | 51 of 52 | 51 of 52 | ✅ |
| RLS **forced** | 51 of 52 | 51 of 52 | ✅ |
| RLS policies | 62 | 62 | ✅ |
| Indexes | 151 | 151 | ✅ |
| Triggers (non-internal) | 10 | 10 | ✅ |
| Migrations applied | 21 | 21 | ✅ |
| Unfinished migrations | 0 | 0 | ✅ |
| Rolled-back migrations | 0 | 0 | ✅ |
| **Tables granted to `verity_app`** | **51** | **0** | ❌ **FAIL** |
| **`ALTER DEFAULT PRIVILEGES` entries for `verity_app`** | **2** | **0** | ❌ **FAIL** |
| **`USAGE` on schema `verity`** | **true** | **false** | ❌ **FAIL** |

`_prisma_migrations` is clean in both: 21 applied, none unfinished, none rolled back.

Nineteen of twenty properties reproduce exactly. The failure is confined to privileges.

---

## 4. Cause

`prisma/migrations/20260823000000_init_tenancy/migration.sql` documents the role setup **as a
comment**:

```sql
-- and granted only what it needs, e.g.:
--   CREATE ROLE verity_app LOGIN NOSUPERUSER NOBYPASSRLS;
--   GRANT USAGE ON SCHEMA public, verity TO verity_app;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO verity_app;
```

Nothing executes it. In the application database the grants exist because that block was run **by
hand, once**, together with `ALTER DEFAULT PRIVILEGES`.

Two properties of PostgreSQL make this invisible until a fresh database is attempted:

1. **Roles are cluster-wide; grants are per-database.** `verity_app` exists and can log in to the
   new database — it simply owns no privileges there. The failure surfaces at the first query, not
   at connection.
2. **`ALTER DEFAULT PRIVILEGES` is per-database and per-grantor.** `CLAUDE.md` states it "grants
   each new table to `verity_app` automatically, so no post-migration grant step is needed" — true
   *within the database where it was set*, and false for any new one. The fresh database has **0**
   such entries.

Schema USAGE on `public` reads `true` in both only because PostgreSQL grants that to `PUBLIC` by
default; USAGE on the `verity` schema — which the migrations create — is correctly `false` in the
fresh database, since nothing granted it.

---

## 5. Why this matters

`CLAUDE.md` treats the runtime/migration role split as load-bearing for INV-001, and it is. But the
mechanism that makes the runtime role *functional* lives outside version control. Consequences:

- A new environment (staging, a client's dedicated database, a disaster-recovery restore, a
  contributor's local database) cannot be provisioned from the repository. It will build, migrate,
  report success, and then fail at runtime with `permission denied`.
- The manual step is undocumented outside a comment, so whoever performs it may guess at the grant
  set — and an over-broad guess is a security regression, while an under-broad one is an outage.
- It directly blocks **Phase 4 gate 4** ("database migrations work") and undermines **gate 15**
  ("a client capability deploys without destabilizing HQ/core"), because a capability that adds a
  table in a fresh environment inherits the same gap.

**This is a reproducibility defect, not a security defect.** Tenant isolation is unaffected —
`verity_app` remains `NOSUPERUSER NOBYPASSRLS`, and the fresh database's 62 policies and forced RLS
are identical to the application database's.

---

## 6. Options — NOT IMPLEMENTED, no authorization

| # | Option | Assessment |
|---|---|---|
| **F1** | A final migration executing the grants and `ALTER DEFAULT PRIVILEGES`, idempotently, without `CREATE ROLE` (roles are cluster-wide and belong to provisioning) | **Recommended.** Puts privileges under version control where the schema already is. Idempotent, so the application database is unaffected. Needs a decision on the exact grant set |
| **F2** | A documented, scripted provisioning step (`prisma/provision-role.ts`) run once per new database | Keeps role concerns out of migrations, which is arguably cleaner, but leaves the repository unable to produce a working database on its own |
| **F3** | Document the manual step only | Rejected — it is what exists today, and it failed this test |

**F1 requires care:** the grant set must be the minimum the runtime needs, and it must not grant on
`_prisma_migrations`. Widening privileges is a security change and needs explicit sign-off, which is
why nothing was written.

---

## 7. Criterion-by-criterion

| Required | Result |
|---|---|
| All 21 migrations apply cleanly | ✅ PASS |
| No migration skipped | ✅ PASS |
| No migration manually edited | ✅ PASS |
| No migration manually patched for the test | ✅ PASS |
| Final tables present | ✅ PASS — 52, identical set |
| Expected functions present | ✅ PASS — 23, identical set |
| RLS enabled/forced where expected | ✅ PASS — 51/51, 62 policies |
| **Grants correct** | ❌ **FAIL — 0 of 51** |
| `_prisma_migrations` clean | ✅ PASS |
| Resulting schema matches expected state | ✅ PASS for structure; ❌ FAIL for privileges |
| Disposable database destroyed | ✅ PASS |
| Application database unmodified | ✅ PASS — 52 tables, 51 grants, untouched |

## Verdict

# PHASE 0.9: FAIL

**Cause identified. Not fixed — remediation requires product-owner authorization on the grant set
(§6).** The schema is fully reproducible; the privilege state is not.
