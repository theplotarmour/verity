# Phase 0.9 — Gate Result

**Date:** 2026-08-26
**Change made:** Option 1 only — one migration, `20260822000000_required_extensions`.
**Result:** **PASS.**

---

## 1. Verdict

> A completely empty PostgreSQL database, given only Verity's migration history, now produces a
> database that is structurally identical to the verified application database, carries the correct
> runtime privileges, contains the extension the runtime actually calls, and is **fully operationally
> usable by `verity_app`** — including tenant isolation, cross-tenant rejection and encrypted
> credential storage.
>
> **291 of 291 tests pass against a fresh database. 0 skipped. No manual step of any kind.**

Both defects 0.9 was built to find are now closed:

| Defect | Was | Now |
|---|---|---|
| 1 — privileges not reproduced | `permission denied for table tenant` (42501) | 51/51 grants, default ACLs identical |
| 2 — extension not reproduced | 3 credential tests fail; wrong-key path returns NULL | 291/291; wrong key **raises** (39000) |

---

## 2. The migration

```
prisma/migrations/20260822000000_required_extensions/migration.sql
```

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

Three decisions, each as authorized:

**Migration-managed.** The dependency now lives in version control alongside the schema and (since
F1) the privileges.

**No schema named.** Deliberately no `WITH SCHEMA`. On a clean database the `extensions` schema does
not exist — it is a Supabase convention, not a platform guarantee — so `WITH SCHEMA extensions`
would abort the migration on exactly the fresh-database case this fix exists for. Unqualified, it
installs to `public` on a clean database and stays put where it already exists. Both resolve,
because `verity.credential_store` and `credential_reveal` declare
`SET search_path = public, verity, extensions, pg_temp`.

**Ordered first.** Dated `20260822000000`, ahead of `20260823000000_init_tenancy` and therefore well
ahead of `20260823090000_workflow_runtime`, which creates the credential functions. Verified in the
apply log:

```
Applying migration `20260822000000_required_extensions`
Applying migration `20260823000000_init_tenancy`
Applying migration `20260823010000_identity_membership`
…
```

The dependency is now explicit rather than resting on PostgreSQL's deferred PL/pgSQL name
resolution.

**Not created, per the criterion:** `uuid-ossp` (zero uses of `uuid_generate_v*`; five migrations
call the core builtin `gen_random_uuid()`) and `pg_stat_statements` (zero uses in `src/` or
`prisma/`). No attempt at Supabase extension-list parity.

---

## 3. Fresh-database result

Disposable database verified empty before migrating:

```
BEFORE migrating -> tables: 0 | extensions: plpgsql
```

All 23 migrations applied from zero. None skipped, edited or patched.

### Structure

| Property | Application | Fresh | Match |
|---|---|---|---|
| Public tables | 52 | 52 | ✅ identical set |
| `verity.*` functions | 23 | 23 | ✅ identical set |
| RLS enabled / forced | 51 / 51 | 51 / 51 | ✅ |
| Policies | 62 | 62 | ✅ |
| Indexes | 151 | 151 | ✅ |
| Triggers | 10 | 10 | ✅ |
| Migrations applied / unfinished / rolled back | 22 / 0 / 0 | 23 / 0 / 0 | ✅ (+1, see §6) |

### Privileges

| Property | Application | Fresh | Match |
|---|---|---|---|
| Runtime table grants | 51 | 51 | ✅ |
| `_prisma_migrations` granted | 0 | 0 | ✅ correctly excluded |
| Schema `public` / `verity` USAGE | true / true | true / true | ✅ |
| Schema `public` / `verity` CREATE | false / false | false / false | ✅ correctly withheld |
| Default ACLs | `public:r:verity_app=arwd/postgres`, `public:S:verity_app=rU/postgres` | **identical strings** | ✅ |
| Role attributes | `rolsuper=false, rolbypassrls=false, rolcanlogin=true` | **identical** | ✅ |

### Extensions

| Database | Extensions |
|---|---|
| Application | `pgcrypto@extensions`, `uuid-ossp@extensions`, `pg_stat_statements@extensions`, `supabase_vault@vault`, `plpgsql@pg_catalog` |
| Fresh | **`pgcrypto@public`**, `plpgsql@pg_catalog` |

**This difference is correct and intended.** The required dependency is present in both; the
platform-supplied extras are not reproduced, per the criterion that a fresh database must contain
*required application dependencies*, not extension-list parity. The schema difference
(`public` vs `extensions`) is the deliberate portability choice of §2 and resolves identically at
call time.

---

## 4. Runtime verification as `verity_app`

| # | Operation | Result |
|---|---|---|
| 1 | `SELECT` with no tenant scope | **0 rows** — fails closed ✅ |
| 2 | Scoped `INSERT` + `UPDATE` + `SELECT` | value round-trips ✅ |
| 3 | Isolation — scope B reading tenant A rows | **0 rows** ✅ |
| 4 | Cross-tenant write | **rejected, SQLSTATE 42501** ✅ |
| 5 | `verity.credential_store` + `credential_reveal` | **round-trip OK** ✅ |
| 6 | Secret stored as ciphertext | **no plaintext in column** ✅ |
| 7 | Reveal with wrong key | **raises, SQLSTATE 39000** ✅ |
| 8 | `EXECUTE verity.is_valid_timezone` | `true` ✅ |

Item 7 is the one that matters most. Before this fix the wrong-key path **returned NULL** — a
security-sensitive test failing into a silent null. On a fresh database built from the corrected
history it now raises, which is the contract the test asserts.

---

## 5. Test results

**Fresh database:**

```
Test Files  21 passed (21)
Tests       291 passed (291)
```

**Application database (regression):**

```
Test Files  21 passed (21)
Tests       291 passed (291)
```

`npm run typecheck` clean. `npm run build` compiled successfully.

**No test was skipped, mocked, weakened or altered.** The three credential tests are exactly as
written; they now pass because the dependency they depend on is reproducible.

---

## 6. Criterion-by-criterion

| Required | Result |
|---|---|
| Completely empty disposable database | ✅ 0 tables, only `plpgsql` |
| All migrations from zero | ✅ 23 applied, extension migration first |
| No manual patching | ✅ |
| All migrations complete | ✅ 23 / 0 unfinished / 0 rolled back |
| 52 tables | ✅ identical set |
| Expected functions | ✅ 23, identical set |
| Expected policies | ✅ 62 |
| Indexes | ✅ 151 |
| Triggers | ✅ 10 |
| RLS | ✅ 51 enabled, 51 forced |
| 51 runtime table grants | ✅ |
| Sequence privileges | ✅ default ACL present |
| Schema usage | ✅ USAGE granted, CREATE withheld |
| Default privileges | ✅ identical |
| No `_prisma_migrations` runtime access | ✅ 0 |
| Required extensions available | ✅ `pgcrypto` |
| Platform extensions not treated as requirements | ✅ `uuid-ossp`, `pg_stat_statements` excluded |
| `verity_app` authentication | ✅ |
| Scoped reads / writes | ✅ |
| Tenant isolation | ✅ |
| Cross-tenant rejection | ✅ 42501 |
| Credential-store behaviour | ✅ round-trip, ciphertext, wrong key raises |
| Acceptance suite | ✅ **291 / 291, 0 skipped** |
| Disposable database destroyed | ✅ 0 copies remain |

## Verdict

# PHASE 0.9: PASS

```
Fresh database
      ↓  23 migrations
Required environment dependencies
      ↓
verity_app
      ↓
Full runtime acceptance suite
      ↓
PASS — 291/291
```

**The migration history is now sufficient to produce a working runtime database from empty state,
without relying on incidental platform state.**

---

## 7. One item outstanding — authorization needed

The application database is at **22 of 23 migrations**. `20260822000000_required_extensions` has not
been deployed there.

It is a verified no-op — `pgcrypto` already exists in that database, and `IF NOT EXISTS` is idempotent
(proven by a clean second run on the probe). But the repository history and the environment have
diverged again by one migration, which is the state F1 deployment was authorized to close last time.

**Not deployed — no authorization was given for this migration.** Recommend the same treatment as
F1: `npx prisma migrate deploy`, then verify 23/23 with structure, grants, RLS and suite unchanged.

**Phase 0 status:** 0.9 **PASS**. 0.10 **BLOCKED** — not attempted. Phase 0 remains **INCOMPLETE**
until 0.10 closes. Phase 1, ADR-013, Global HQ and Kent's all unstarted.
