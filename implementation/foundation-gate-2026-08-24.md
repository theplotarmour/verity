> **SUPERSEDED — 2026-08-24 (later the same day).** Records **280 Vitest / 60 Playwright** and lists three client-build bindings. Two of those have since been closed at the contract level and the metrics have moved to **285 / 60**.
>
> Current canonical readiness artifact: [`final-platform-readiness.md`](final-platform-readiness.md). Retained as historical evidence; not rewritten.

# Verity Foundation Gate — 2026-08-24

**Scope:** blocker remediation and the final foundation gate. No client, industry pack,
domain capability or business feature was built. No architecture was redesigned. No security
invariant was weakened and no test was disabled, skipped or loosened to pass.

**Method:** every number below was produced by running the command quoted beside it on this
machine, in this checkout, in the order shown. Nothing is carried over from an earlier report.
Where a claim could not be reproduced, that is stated rather than smoothed over.

**Environment:** darwin (macOS), Node v26.4.0, Prisma 6.19.3, Next.js 16.2.10, PostgreSQL 17.6
(Supabase). This matters for Blocker 2, which is Windows-specific.

---

## Blocker 1 — Database runtime role

### The audit's claim did not reproduce

The audit reported that "the active DATABASE_URL resolves to postgres with rolbypassrls=true".
On this checkout it does not:

```
DATABASE_URL
  url user  : verity_app.ygkjidaggwvhjgpqlkmj
  connected : verity_app
  rolsuper  : false
  bypassrls : false        <-- invariant holds
DIRECT_URL
  url user  : postgres
  connected : postgres
  bypassrls : true         <-- by design; migrations only
```

`DIRECT_URL` is *supposed* to bypass RLS — it is the migration connection, and CLAUDE.md
records that deliberately. The likely origin of the finding is that the audit measured
`DIRECT_URL` and attributed it to the runtime, or measured while `verity_app` authentication
was failing (it was, until earlier today: the role's server-side password had drifted from
`.env`, so every runtime query was rejected).

### No fallback exists, which was the real thing worth ruling out

If anything fell back from `DATABASE_URL` to `DIRECT_URL` when the app role failed, the runtime
would silently acquire RLS bypass. It does not:

- `src/server/platform/db.ts:12` constructs `new PrismaClient()` with **no** `datasourceUrl`,
  so it takes the schema's `url = env("DATABASE_URL")`.
- Every `DIRECT_URL` reference in the repository is in a test fixture (`admin` clients that
  deliberately bypass RLS to seed rows) or in `prisma/seed.ts`. None is in `src/server/`.

### A real defect WAS found, and fixed

`assertRlsEnforceable()` existed, was correct, and was called by **seventeen test files and by
no application code**. The comment in `db.ts` claimed it ran "at startup"; it did not. The guard
therefore protected only environments the test suite happened to be pointed at. A deployment
whose `DATABASE_URL` named a `SUPERUSER` or `BYPASSRLS` role would have started, served traffic,
and returned every tenant's rows to every caller — with all 62 RLS policies still present and
the test suite still green somewhere else.

Fix: the guard now runs on the runtime path, at the single chokepoint every tenant-scoped read
and write passes through.

```ts
// src/server/platform/tenancy.ts
export async function withTenant<T>(tenantId: string, fn: …): Promise<T> {
  // Before any tenant-scoped statement, not after. A role that bypasses RLS
  // must never get as far as opening the transaction.
  await ensureRlsEnforceable();
  return prisma.$transaction(…);
}
```

It is memoised — one query per process, not one per transaction. A **failed** check is
deliberately not memoised, so a transient connection error cannot poison the process for its
lifetime while a genuinely bypassing role simply fails again. Isolation fails closed either way.

`tenancy.ts` was not weakened; a guard was added to it. The conformance tests were not touched.

### The fix is proven load-bearing, not merely present

Two assertions were added to `src/test/tenant-isolation.test.ts`:

| Assertion | What it proves |
|---|---|
| `permits the configured runtime role, which must not bypass RLS` | the live runtime role is `NOSUPERUSER NOBYPASSRLS`, and `withTenant` accepts it |
| `refuses to run a tenant-scoped operation on a bypassing role` | `withTenant` rejects before the callback runs |

Mutation-tested. With `await ensureRlsEnforceable()` removed:

```
× refuses to run a tenant-scoped operation on a bypassing role
  Tests  1 failed | 1 passed | 9 skipped (11)
```

Guard restored; suite green. A test that cannot fail proves nothing, so this was checked rather
than assumed.

---

## Blocker 2 — Prisma build failure (Windows EPERM)

### Root cause

`package.json` defines:

```json
"build": "prisma generate && next build"
```

`prisma generate` installs the query engine by writing a temporary file and **renaming it over**
`node_modules/.prisma/client/query_engine-windows.dll.node`. Windows refuses to rename over a
DLL that another process has loaded; POSIX permits it. Any running `next dev`, `next start`,
`vitest` worker or Playwright `webServer` has that native module loaded into its process.

So the failure is not random and not a Prisma architecture problem: running `npm run build`
while `npm run dev` is open in another terminal produces `EPERM: operation not permitted,
rename` **on Windows only**. That is precisely the shape of a reproducibility run, which is why
an auditor hits it and CI usually does not.

Secondary lock holders, same mechanism: Defender real-time scanning of `node_modules`, and
OneDrive/Dropbox sync if the repository sits inside a synced folder.

### Remediation

The cause is a process holding a file lock, so the remedy is to release it — not to change the
build. `prisma generate` before `next build` is correct: it guarantees the client matches the
schema. Adding a retry or a `--force` would hide the failure, which the brief forbids.

On Windows, before building:

```powershell
taskkill /F /IM node.exe          # release the engine lock
npm run build
```

Durable fixes: exclude the repository from OneDrive/Dropbox sync; add `node_modules` to Defender
exclusions; never run `build` and `dev` concurrently.

### What was verified here, and what was not

Verified on darwin — clean-state regeneration and build:

```
$ rm -rf node_modules/.prisma/client
$ npx prisma generate
  ✔ Generated Prisma Client (v6.19.3) to ./node_modules/@prisma/client in 228ms
$ npm run build      # exit 0
  ✔ Generated Prisma Client (v6.19.3) to ./node_modules/@prisma/client in 214ms
  ✓ Compiled successfully in 2.8s
```

**Not verified:** the Windows path. This machine is darwin and cannot produce a Windows `EPERM`.
The mechanism above is established from the rename semantics and the build script, and the
remediation follows from it — but it is a diagnosis, not a reproduction. Until someone runs the
gate on Windows with no Node process live, that specific blocker is *explained*, not *closed*.

Unrelated, noted not fixed: `prisma generate` warns that `package.json#prisma` is deprecated and
will be removed in Prisma 7. It is a forward-compatibility item, not a blocker.

---

## Gate 3 — Reproducibility

Run in order, from a clean generated client, with no Node process holding the engine
(`pgrep -fl "next dev|next-server|vitest"` → none).

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | **0** | clean (`tsc --noEmit`) |
| `npm run lint` | **0** | clean (`eslint`) |
| `npm run build` | **0** | Prisma client generated; `✓ Compiled successfully in 2.8s` |
| `npm test` | **0** | **Test Files 20 passed (20) · Tests 280 passed (280)** |
| `npx playwright test` | **0** | **60 passed, 12 skipped** (desktop + mobile) |

### Nothing substantive is disabled

- **Vitest: 0 skipped.** `describeDb = hasDatabase ? describe : describe.skip` — a database is
  present, so every database suite ran. All 280 tests executed.
- **Playwright: 12 skipped**, all from `e2e/shell.spec.ts:18`:
  `test.skip(testInfo.project.name !== "desktop", "asserts the desktop hierarchy")`. These are
  desktop-layout assertions correctly scoped out of the mobile project, not disabled tests.
- No `.only`, no `describe.skip` on a substantive suite, no assertion loosened to pass.

Two Playwright tests **did** fail during this gate and were fixed by correcting the source, not
the test — see "Regression found and fixed" below.

---

## Gate 5 — Security verification

Each property below is bound to a named, executed assertion. Every one passed in the run above.

| Property | Evidence (test → assertion) |
|---|---|
| **Tenant isolation** | `tenant-isolation` → `shows a tenant only its own tenant row`; `shows a tenant only its own organizations`; `leaves the other tenant's view unchanged` |
| **RLS enforcement** | `conformance` → `enables and forces RLS on every application table` |
| **Runtime role cannot bypass RLS** | `tenant-isolation` → `permits the configured runtime role, which must not bypass RLS`; `refuses to run a tenant-scoped operation on a bypassing role`; `conformance` → `refuses to run the platform on a connection that bypasses RLS` |
| **Fails closed with no context** | `tenant-isolation` → `returns nothing when no tenant context is set (fails closed)`; `refuses a write with no tenant context` |
| **Organization scoping** | `authorization-layers` → `gives a parent-node actor visibility over the whole subtree (PLA-ORG-002)`; `keeps a branch actor out of sibling branches (PLA-ORG-003)`; `does not give a child actor visibility upward`; `reaches every organization on a Tenant-scoped grant` |
| **Row-level authorization** | `authorization-layers` → `admits a record inside the actor's scope`; `rejects a record in a sibling branch with E_FORBIDDEN (PLA-AUT-004)`; `refuses an unscoped record unless the grant is tenant-wide`; `produces a query filter matching the actor's subtree` |
| **Field-level stripping** | `authorization-layers` → `strips a restricted field from an actor without the grant (PLA-AUT-005)`; `omits the field rather than nulling it`; `keeps a field the actor is granted and strips the one they are not`; `applies redaction automatically through the query pipeline` |
| **Command authorization** | `command-runtime` → `rejects an unauthorized actor with E_FORBIDDEN (MET-ACT-002)`; `denies an actor with no role at all (fails closed)`; `refuses a query the actor may not read` |
| **Audit immutability** | `audit-runtime` → `refuses to rewrite an activity row (EXE-AUD-003)`; `refuses to delete an activity row`; **`refuses to rewrite an activity row even for a BYPASSRLS role`**; `leaves recorded events intact when the application tries to delete them (MET-EVE-001)`; `conformance` → `keeps the audit and event tables append-only by trigger` |
| **Cross-tenant access rejection** | `tenant-isolation` → `refuses a write owned by another tenant`; `refuses to move a row into another tenant`; `refuses a cross-tenant parent organization (PLA-TEN-003)`; `authorization` → `refuses composition across tenants`; `hides another tenant's roles and permissions`; `audit-runtime` → `keeps one tenant's audit trail invisible to another` |

Additional authorization properties proven in the same run: role composition flattening,
no downward leak of a parent's grants, direct and transitive inheritance cycles refused,
`Global`-scope grants never returned, and a membership with no role granting nothing.

Note the audit-immutability row: the append-only trigger holds **even for a BYPASSRLS role**,
so audit integrity does not depend on the connection role being correct.

---

## Regression found and fixed during the gate

The first Playwright run failed 3 tests (exit 1). All three traced to one change made earlier
today: a trailing "Actions" column added to the data table.

- `accessibility` → `state is never communicated by colour alone` — the assertion targets the
  last cell; the new column displaced it.
- `shell` → `runs a command and reflects the new state, with audit` and `offers no transition
  the capability has not declared` — **strict-mode violation**: the action link's accessible
  name `"Open Demo Support Vehicle"` overlapped the record link `"Demo Support Vehicle"`.

The second is a genuine defect, not a stale locator: every row carried **two links to the same
destination** with overlapping accessible names. The mockup's `⋮` implies a menu of per-row
actions; this platform has exactly one thing to do with a row — open it — which the first column
already does.

Resolution: the column was **removed**, and the reason recorded in `DataTable.tsx`. Weakening
the accessibility assertion to accommodate a redundant control would have been the prohibited
move. Re-run: **60 passed, exit 0**.

---

## Open items — none blocking this gate, all pre-existing

| Item | Status | Blocks foundation? |
|---|---|---|
| Nothing runs on a schedule | SLA sweeps and notification dispatch are implemented and idempotent, but nothing invokes them | No — blocks a *capability that depends on a deadline firing* |
| No storage driver bound | Files contract complete; no backend attached | No — deployment step |
| `Global` permission scope | Defined, never granted; `resolve_permissions` filters it out | No — needs a security ADR |
| `own` permission scope | Appears in neither Bible nor spec | No — needs an ADR |
| Failed sign-ins not recorded | Pre-authentication has no tenant; the security stream is tenant-scoped | No — decision, not implementation |
| Windows build path | Diagnosed, not reproduced on Windows | **Yes, for a Windows team** |
| `package.json#prisma` deprecated | Removed in Prisma 7 | No |

---

## Verdicts

```
FOUNDATION:                    READY
EXPERIENCE SHELL:              READY
ARBITRARY MODULE COMPOSITION:  READY
CLIENT BUILD:                  NOT YET ALLOWED
```

**FOUNDATION: READY.** All five reproducibility gates exit 0. All nine required security
properties are bound to named, executed assertions. The one real defect found — a runtime RLS
guard that only ever ran in tests — is fixed at the chokepoint and mutation-tested.

**EXPERIENCE SHELL: READY.** 60 Playwright assertions pass across desktop and mobile, including
landmarks, skip link, accessible names on every form control, table captions, sortable headers
with sort state, state never communicated by colour alone, and no horizontal overflow.

**ARBITRARY MODULE COMPOSITION: READY.** `foundation-acceptance.test.ts` composes an unforeseen
capability on the foundation — command pipeline, tenant extensions, tenant configuration as a
business rule, rejection of undeclared and out-of-range extension values, shared audit stream,
and complete disappearance when the tenant suspends it (PLA-CAP-002). `conformance.test.ts`
enforces the contracts that keep it true: no capability imports one it has not declared, every
capability mutation routes through a command definition, and no capability sets a tenant scope
by hand.

**CLIENT BUILD: NOT YET ALLOWED.** Not because the foundation failed — it passed — but because:

1. **Nothing runs on a schedule.** A client capability with an SLA or a notification would
   silently never fire. This is the one gap that would bite a real client on day one.
2. **No storage driver is bound.** Any capability handling files has no backend.
3. **The Windows build path is unproven.** If the client team builds on Windows, the
   reproducibility gate has not actually been demonstrated for them.

None requires redesign. All three are bindings, not architecture.
