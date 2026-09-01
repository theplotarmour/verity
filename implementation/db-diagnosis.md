# Phase 0.6 — Database Diagnosis

**Date:** 2026-08-26
**Classification:** **INFRASTRUCTURE — credential mismatch.** Level 2 of the five-level escalation.
**Architectural fault:** **NONE.** No application or architecture change is indicated.
**Status:** cause proven; remediation **not executed** — it requires a credential decision and an
owner (§6).

---

## 1. Verdict

> The `verity_app` database role exists, is correctly configured, and holds a password.
> The password recorded in `.env` does not match it. Nothing else is wrong.

The earlier `ECIRCUITBREAKER` message was a *symptom* — Supabase's pooler protection tripping after
repeated failed authentications. It has since cleared, revealing the underlying error.

| Before (masked by breaker) | After breaker cleared |
|---|---|
| `FATAL: (ECIRCUITBREAKER) too many authentication failures, new connections are temporarily blocked` | `Authentication failed against database server, the provided database credentials for 'verity_app' are not valid` |

---

## 2. Escalation ladder — where it stopped

| Level | Check | Result |
|---|---|---|
| 1 · Connectivity | Reach the host, complete a query | **PASS** — `DIRECT_URL` connects, PostgreSQL **17.6** |
| 2 · Credentials | Authenticate as each role | **FAIL — `verity_app` only.** `postgres` authenticates normally |
| 3 · Configuration | Role targets, ports, pool params | **PASS** — see §4 |
| 4 · Application / test setup | Test runner env loading, skip guards | **PASS** — see §5 |
| 5 · Architecture | — | **NOT REACHED.** No finding written, none warranted |

Per D23 the investigation stops at the first level that explains the evidence. Level 2 explains it
completely: one role fails to authenticate, every other property of the system is intact.

---

## 3. Evidence

### 3.1 Both roles, same host, one fails

```
DATABASE_URL (verity_app)  FAIL: credentials for `verity_app` are not valid
DIRECT_URL   (postgres)    OK   : current_user=postgres, server_version=17.6
```

Identical host, port and database. Only the role and password differ. This isolates the fault to
the `verity_app` credential and rules out network, host, pooler and database availability.

### 3.2 The role itself is correct — read via the working `postgres` connection

| rolname | rolcanlogin | rolsuper | rolbypassrls | rolvaliduntil | password set |
|---|---|---|---|---|---|
| `authenticator` | true | false | false | — | — |
| `postgres` | true | false | **true** | — | yes |
| `verity_app` | **true** | **false** | **false** | none | **yes** |

**INV-001's structural precondition is intact.** `verity_app` is `NOSUPERUSER NOBYPASSRLS`, exactly
as `CLAUDE.md` requires, with no expiry and a password present. The role was not dropped, disabled,
expired, or recreated with BYPASSRLS — which is the dangerous failure mode this project explicitly
guards against, and it did **not** occur.

`postgres` carries `rolbypassrls = true` as documented, which is why it is confined to
`prisma migrate` and must never carry application traffic.

### 3.3 The database contents are complete

| Property | Value |
|---|---|
| Public tables | **52** |
| RLS enabled | **51 of 52** |
| RLS **forced** | **51 of 52** |
| Table without RLS | `_prisma_migrations` — correct; it is Prisma's own bookkeeping and carries no tenant data |
| `verity.*` functions | **23** present, including `provision_identity`, `resolve_permissions`, `memberships_for_auth_user`, `organization_subtree`, `role_composition_no_cycle`, `domain_event_append_only` |
| Tables granted to `verity_app` | **51** — the `ALTER DEFAULT PRIVILEGES` arrangement worked |
| Migrations | **21 applied, 0 unfinished** |

No migration is partially applied. No grant is missing. No policy is absent. **The schema is not
the problem.**

---

## 4. Configuration review (level 3)

| Setting | Value | Assessment |
|---|---|---|
| `DATABASE_URL` role | `verity_app.<project-ref>` | **Correct** — runtime role |
| `DIRECT_URL` role | `postgres.<project-ref>` | **Correct** — migration role |
| Host | `aws-1-ap-south-1.pooler.supabase.com` | Same for both; correct |
| Port | `5432` (session mode) both | **Wrong for the runtime** — corrected 2026-09-01. `DATABASE_URL` is now `6543` (transaction mode) with `pgbouncer=true`; session mode exhausts its 15-connection pool because it pins one connection per client for the client's whole life. `DIRECT_URL` stays unpooled for migrations. |
| Pool params | `connection_limit=10&pool_timeout=20` on runtime only | Reasonable |
| Password length | runtime 64 chars · migration 12 chars | Structurally plausible; the runtime value is simply **wrong**, not malformed |

Role-to-URL assignment matches `CLAUDE.md` exactly. Nothing here needs changing.

---

## 5. Why 258 of 291 tests reported as skipped (level 4)

This needed its own answer, because "skipped" can be misread as "fine".

**The skip guard is not the cause.** Every database suite uses:

```ts
const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;
```

`DATABASE_URL` **is** set, so `hasDatabase` is `true` and no suite self-skipped.
`src/test/setup-env.ts` loads `.env` correctly (Vitest does not read it natively), so the variable
reaches the runner. Both mechanisms worked as designed.

**The actual cause:** suites entered, then their `beforeAll` / first statement failed on
authentication. When a setup hook throws, Vitest aborts the file and reports its remaining tests as
skipped. So the 258 skips are a **downstream artifact of the single auth failure**, not an
independent problem. Fixing the credential should clear them all.

### 5.1 A latent weakness worth recording (not fixed here)

The guard tests whether `DATABASE_URL` is **set**, not whether the database is **reachable**. The
unset case is handled loudly and correctly — it warns locally and *throws* in CI, because the
tenant-isolation suite is the Phase 0 gate and a silent skip there would report green while INV-001
went unverified. That design is sound.

The **set-but-unreachable** case, which is what happened, surfaces as a large skip count instead.
Nothing was reported as passing that did not pass, so no false green occurred — but a reader
scanning the summary could mistake skips for irrelevance.

**Recommendation for Phase 3, not now:** add a reachability probe to the guard so a set-but-broken
`DATABASE_URL` fails the same way an unset one does. This *strengthens* an acceptance criterion and
does not weaken any test. **Not implemented — it is a change to test code and this diagnosis
carries no authorization.**

---

## 6. Remediation required — NOT EXECUTED

The fix is to bring the `verity_app` password in `.env` and the password in PostgreSQL back into
agreement. Two routes, and the choice is the product owner's because it is a credential decision:

| Route | Action | Consequence |
|---|---|---|
| **R1 — recover** | Retrieve the current `verity_app` password from wherever it was stored when the role was created, and correct `.env` | No database change. Preferred if the value exists |
| **R2 — rotate** | `ALTER ROLE verity_app WITH PASSWORD '<new>'` via the working `postgres` connection, then update `.env` | A **database change**. Requires explicit authorization |

**R2 was deliberately not performed.** It modifies the database, and §14 of the work plan states
this plan is not authorization to implement. It also invalidates the credential for any other
environment using it — which is a deployment question, not a local one.

**Post-remediation verification, in order:**

1. `SELECT 1` succeeds via `DATABASE_URL`
2. `rolbypassrls = false` for `verity_app` — re-confirm, because a recreated role can silently
   return with BYPASSRLS and every test would still pass while isolation was gone
3. `assertRlsEnforceable()` passes
4. `npm run test` — expect **0 skipped**
5. Record which suites now execute that previously could not

---

## 7. What is proven, and what is not

| Claim | Status |
|---|---|
| Database reachable | **PROVEN** — `postgres` connects, PG 17.6 |
| Schema complete and migrated | **PROVEN** — 52 tables, 21 migrations, 0 unfinished |
| RLS present and forced on every tenant-bearing table | **PROVEN** — 51 of 52; the exception is `_prisma_migrations` |
| Runtime role is non-bypassing (INV-001 precondition) | **PROVEN** — `rolsuper=false`, `rolbypassrls=false` |
| Grants correct for the runtime role | **PROVEN** — 51 tables |
| Platform functions present | **PROVEN** — 23 `verity.*` functions |
| Cause of the failure | **PROVEN** — `verity_app` credential mismatch |
| Cause of the skips | **PROVEN** — hook failure cascade, not the guard |
| **Tenant isolation behaves correctly at runtime** | **NOT PROVEN** — needs the suite to execute |
| **Authorization layers 1–3 behave correctly** | **NOT PROVEN** — needs the suite to execute |
| **Command / state / event / audit runtime** | **NOT PROVEN** — needs the suite to execute |
| **Every "PROVEN" claim in `final-platform-readiness.md`** | **DOCUMENTED EXPECTATION** until the suite executes |

The structural preconditions for INV-001 are verified. Its *behaviour* is not, and will not be
until the credential is corrected and the tests run. That distinction is held deliberately: nothing
here upgrades a claim on the strength of the schema looking right.

---

## 8. Conclusion

**No architectural change is warranted. No test was weakened. No mock replaced an integration
test. No readiness claim was upgraded.**

One credential is out of sync. Everything else — role configuration, schema, migrations, RLS
policies, grants, platform functions, test environment loading, skip guards — is correct and
verified.

**Next action:** product-owner decision on R1 versus R2 (§6), then run the four verification steps.
Until then the test environment cannot execute reliably, and Phase 0's acceptance criteria remain
**unmet**.

---

# ADDENDUM — R2 executed, 2026-08-26

**Authorized by:** product owner, explicit selection of R2 (rotate).
**Scope executed:** `ALTER ROLE verity_app WITH PASSWORD` and one password substitution inside
`.env`. Nothing else.

## What was and was not changed

| Constraint | Honoured |
|---|---|
| Role privileges unchanged | **Yes** — pre/post read: `rolsuper=false`, `rolbypassrls=false`, `rolcanlogin=true`, `rolvaliduntil=null`, identical before and after |
| RLS untouched | **Yes** — no policy, no `FORCE`, no table altered |
| Ownership untouched | **Yes** |
| `BYPASSRLS` not granted | **Yes** — the script aborts if it ever reads true |
| Schema / migrations untouched | **Yes** |
| Application architecture untouched | **Yes** — no source file modified |
| Credentials not committed | **Yes** — `.env` is gitignored (`.gitignore:34`); the generated value was never printed |
| `.env` minimally changed | **Yes** — final file differs from the pre-rotation copy by exactly 16 bytes on one line, the password. Line endings preserved as CRLF |

The rotation script guarded itself: it re-read the role before acting and would have aborted had
`verity_app` already carried SUPERUSER or BYPASSRLS, and it re-read afterwards and would have
failed loudly had privileges or login capability changed.

## Verification

```
DATABASE_URL (verity_app)  OK  current_user=verity_app  rolbypassrls=false  rolsuper=false
DIRECT_URL   (postgres)    OK  current_user=postgres    rolbypassrls=true   rolsuper=false
```

Both roles behave exactly as `CLAUDE.md` requires: the runtime role cannot bypass RLS, the
migration role can and is confined to migrations.

## Test results — full suite, real database

```
Test Files  21 passed (21)
Tests       291 passed (291)
Duration    24.66s
```

| Metric | Before rotation | After rotation |
|---|---|---|
| Files passed | 2 of 21 | **21 of 21** |
| Tests passed | 29 | **291** |
| Tests failed | 4 | **0** |
| Tests skipped | 258 | **0** |

Every previously-skipped suite now executes: tenant isolation, authorization, authorization
layers, command runtime, state runtime, entity runtime, audit runtime, conformance, composition,
identity/membership, capability suites, workflow, temporal/SLA, files/notifications, sync, proxy,
experience runtime, foundation acceptance.

**No test was weakened, skipped, mocked or modified.** No source file was touched. The suite went
green because the credential was corrected, which is the only honest way this number could move.

Additional gates:

- `npm run typecheck` — clean
- `npm run build` — succeeds; 15 routes compiled, middleware present

## Failures

**None.** No pre-existing failure, no newly introduced failure.

## Outstanding Phase 0 criteria — NOT met

| Criterion | Status |
|---|---|
| 0.9 — a migration applies cleanly to a **fresh** database, with `ALTER DEFAULT PRIVILEGES` granting new tables to `verity_app` automatically | **NOT VERIFIED.** Evidence exists that the 21 applied migrations left 51 tables correctly granted, but applying to a fresh database was not executed — it requires a disposable database, which is a separate decision |
| 0.10 — deployment verification baseline | **NOT EXECUTED** |

## Security incident record — remediation DEFERRED by product-owner decision

During comparison of a secret-bearing file, a **live migration-role credential** was inadvertently
exposed in session output. No credential value is recorded in this document.

**Status: coordinated rotation DEFERRED**, by explicit product-owner decision. Rotating the
migration/admin role requires coordinated credential updates across Vercel and potentially other
environments, and an uncoordinated rotation at this stage is not wanted. The role, its privileges,
`BYPASSRLS`, RLS and migrations are all left unchanged. No compensating security change was made.

Rotation will be handled as a coordinated environment operation when explicitly authorised.

**Process correction adopted going forward:** secret-bearing files are compared by hash, redacted
output, file metadata, or byte and line counts — never by printing their contents.
