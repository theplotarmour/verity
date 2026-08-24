# Verity — Final Platform Readiness

**Date:** 2026-08-24
**Status:** CANONICAL. Supersedes every earlier readiness or gate document in this directory.
**Scope:** the reusable platform. No client, industry pack, domain module or business feature
has been started, and none was created to produce this report.

**Method:** every figure was produced by running the quoted command on this checkout. Claims
that could not be reproduced are recorded as unreproduced rather than smoothed over.

**Environment:** darwin (macOS), Node v26.4.0, Prisma 6.19.3, Next.js 16.2.10,
PostgreSQL 17.6 (Supabase).

---

## Status vocabulary

Used strictly below. Code existing is not readiness.

| Term | Means |
|---|---|
| **PROVEN** | An executable assertion fails if the property stops holding |
| **IMPLEMENTED** | The code exists and typechecks; behaviour is not asserted end to end |
| **BOUND** | A concrete provider or caller is wired to the contract |
| **OPERATIONAL** | Bound *and* actually executing in a deployment |
| **DEFERRED BY DESIGN** | Deliberately absent; a decision is recorded |
| **BLOCKED** | Prevents the next step and has no path without a decision |

---

## 1. Verification gate

Run with no Node process holding the Prisma engine.

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | **0** | clean |
| `npm run lint` | **0** | clean |
| `npm run build` | **0** | 14 routes emitted |
| `npm test` | **0** | **20 files · 285 passed · 0 skipped · 0 failed** |
| `npx playwright test` | **0** | **60 passed · 12 skipped · 0 failed** |

**Zero Vitest suites skipped.** `describeDb = hasDatabase ? describe : describe.skip`, and every
database suite additionally **throws** when `CI` is set and `DATABASE_URL` is not — a skipped
isolation test proves nothing, and the suite refuses to let CI be where tenancy quietly stops
being verified.

The 12 Playwright skips are all `e2e/shell.spec.ts:18` —
`test.skip(testInfo.project.name !== "desktop")` — desktop-layout assertions correctly scoped
out of the mobile project. No `.only`, no disabled suite, no loosened assertion.

---

## 2. Security — PROVEN

Runtime role, reproduced live rather than quoted:

```
DATABASE_URL  -> verity_app  rolsuper=false  bypassrls=false
DIRECT_URL    -> postgres    rolsuper=false  bypassrls=true   (migrations/seed only)
```

`src/server/platform/db.ts` constructs `new PrismaClient()` with **no** `datasourceUrl`, so it
takes the schema's `url = env("DATABASE_URL")`. Every `DIRECT_URL` reference in the repository
is a test fixture or `prisma/seed.ts`. **None is in `src/server/`.**

### The runtime RLS guard is now in the repository of record

`assertRlsEnforceable()` was called by seventeen test files and by **no application code**,
while `db.ts` claimed it ran "at startup". It protected only environments the test suite was
pointed at. A deployment naming a `SUPERUSER` or `BYPASSRLS` role would have served every
tenant's rows to every caller with all 62 policies present and the suite green elsewhere.

It now runs inside `withTenant` — the single chokepoint for every tenant-scoped read and write —
before the transaction opens. Memoised at one query per process; a **failed** check is
deliberately not memoised, so a transient error cannot poison the process while a genuinely
bypassing role fails again. **Committed as `0fc9a31`; present in `HEAD`.**

Mutation-tested: removing `await ensureRlsEnforceable()` fails
`refuses to run a tenant-scoped operation on a bypassing role`. A test that cannot fail proves
nothing.

| Property | Status | Evidence |
|---|---|---|
| Runtime role cannot bypass RLS | **PROVEN** | `permits the configured runtime role…` · `refuses to run a tenant-scoped operation on a bypassing role` · `refuses to run the platform on a connection that bypasses RLS` |
| RLS enabled and forced | **PROVEN** | `enables and forces RLS on every application table` |
| Tenant isolation | **PROVEN** | `shows a tenant only its own tenant row` · `…own organizations` |
| Fails closed with no context | **PROVEN** | `returns nothing when no tenant context is set` · `refuses a write with no tenant context` |
| Cross-tenant rejection | **PROVEN** | `refuses a write owned by another tenant` · `refuses to move a row into another tenant` · `refuses a cross-tenant parent organization (PLA-TEN-003)` · `refuses composition across tenants` |
| Organization scoping | **PROVEN** | `PLA-ORG-002` subtree · `PLA-ORG-003` sibling isolation · `does not give a child actor visibility upward` |
| Row-level authorization | **PROVEN** | `rejects a record in a sibling branch with E_FORBIDDEN (PLA-AUT-004)` |
| Field-level stripping | **PROVEN** | `strips a restricted field (PLA-AUT-005)` · `omits the field rather than nulling it` |
| Command authorization | **PROVEN** | `rejects an unauthorized actor with E_FORBIDDEN (MET-ACT-002)` · `denies an actor with no role at all` |
| Audit immutability | **PROVEN** | `refuses to rewrite an activity row **even for a BYPASSRLS role**` · `keeps the audit and event tables append-only by trigger` |
| Evidence authorization | **PROVEN** | `keeps evidence immutable even for a privileged role` |
| Capability activation boundaries | **PROVEN** | `refuses activation while a dependency is inactive (PLA-CAP-003)` · `blocks a capability's commands when the tenant suspends it` |

Audit immutability holds **even for a role that bypasses RLS**, so audit integrity does not
depend on the connection role being configured correctly.

---

## 3. Scheduled work — CONTRACT PROVEN, PROVIDER UNBOUND

### What was missing

`CapabilityContribution` carried `navigation` and `workspace`. A capability could say where it
appears and what queues it owns, but **not that it has work which recurs**. Any capability
needing a periodic sweep would have had to edit platform code.

### What was added

`ScheduleContribution` in `src/server/platform/contribution.ts`, mirroring the existing
contribution pattern. Three concerns are separated deliberately:

| Concern | Where | Who owns it |
|---|---|---|
| **DECLARATION** | `ScheduleContribution` | the capability |
| **PROVIDER** | not implemented | the deployment |
| **EXECUTION** | `runDueWork()` | the platform |

A capability declares `{ key, label, cadence, run }`. `cadence` is a closed set —
`frequent | hourly | daily | weekly` — **not a cron string**: a capability knows work is
"daily", not that production runs `0 3 * * *`, and an open cron expression is a configuration
language the platform would have to honour on every provider it ever binds.

`run` receives a `TenantScopedClient`, so scheduled work inherits RLS, the tenant GUC and the
transaction budget exactly as a command does. **There is no privileged scheduling path around
tenancy.** It returns events in the same shape command handlers use, so scheduled work feeds the
same event and audit streams as any other write.

`runDueWork()` isolates failures per unit: one failing job cannot cancel the batch, because
scheduled work is unrelated jobs sharing a clock. Outcomes are returned, not logged — what to do
with a failure is a deployment decision, and a platform that writes to stdout has already chosen
for the operator.

### Why no provider was bound

No authority names one. `verity-spec/07_workflow_automation/scheduler.md` concerns *resource
availability slot math* (calcom patterns) and is `[UNKNOWN_REASON: FUTURE_CAPABILITY]`. The only
Temporal material lives under `verity-bible/reference/`, which CLAUDE.md classifies as research
evidence, not implementation authority. **Binding a vendor would have invented a constitutional
requirement.**

| Aspect | Status |
|---|---|
| Declaration contract | **PROVEN** — 5 assertions in `composition.test.ts` |
| Discovery by cadence | **PROVEN** |
| Execution under tenancy | **PROVEN** — asserts `current_setting('verity.tenant_id')` inside the handler |
| Per-unit failure isolation | **PROVEN** |
| Vendor neutrality | **PROVEN** — a test strips comments and asserts no vendor name appears in code |
| Provider adapter | **DEFERRED BY DESIGN** |
| Executing in production | **NOT OPERATIONAL** |

**Remaining work is one adapter:** a route handler that authenticates the caller, enumerates
active tenants, calls `runDueWork`, and a deployment trigger pointed at it. No platform change.

---

## 4. Storage — CONTRACT PROVEN, PROVIDER UNBOUND

| Question | Status |
|---|---|
| Abstraction defined | **IMPLEMENTED** — `StorageDriver { createUploadUrl, createReadUrl, delete }` |
| Injectable / testable | **PROVEN** — the suite registers a fake driver |
| Tenant-isolated | **PROVEN** — `namespaces every storage key by tenant` · `keeps files invisible to another tenant` |
| Fails honestly when unbound | **PROVEN** — `reports honestly that no storage backend is bound` |
| Integrity | **PROVEN** — trigger `stored_file_immutable_once_stored` freezes key, checksum and size |
| Evidence linkage | **IMPLEMENTED** — `Evidence.fileId → StoredFile` |
| Concrete driver | **DEFERRED BY DESIGN** |

`REQ-HORIZONTALSYSTEMS-FILES-001` names minio patterns but is
`[UNKNOWN_REASON: FUTURE_CAPABILITY]` — permissive under ADR-010, not required. No provider
credentials exist, and fabricating them to obtain a green report would be the wrong trade.
`@aws-sdk/client-s3` and `s3-request-presigner` are already declared; the remainder is a ~30-line
adapter plus credentials, entirely behind the existing contract.

---

## 5. Notifications — CONTRACT COMPLETE, TRANSPORT UNBOUND

| Layer | Status |
|---|---|
| Capability-facing API (`notify`) | **IMPLEMENTED** — transport-agnostic |
| Outbox | **IMPLEMENTED** — `Pending / Sent / Failed / Suppressed`, indexed `[tenantId, status]` |
| Suppression recorded, not dropped | **PROVEN** — "why did nobody get told" is answerable |
| Read/unread state | **PROVEN** |
| Completion primitive (`markSent`) | **PROVEN** |
| Dispatcher loop | **DEFERRED** — now expressible as a `ScheduleContribution` |
| Transport (email/push/SMS) | **DEFERRED BY DESIGN** — deployment binding |

A capability says "notify this actor" without knowing the transport. That is the platform
contract, and it is complete. No fake transport was created.

---

## 6. Legacy contamination removed

`vercel.json` scheduled two production crons against endpoints that **do not exist**:

```
/api/webhooks/drain        0 3 * * *
/api/cron/subscriptions    0 2 * * *
```

`src/app/api` was deleted in `47fa703 refactor(cleanup): archived legacy VEDA/MES codebase
files`, and `subscription` appears **0 times** in `prisma/schema.prisma`. Both 404'd daily.
**Removed, not replaced with stubs.** No subscription infrastructure was created merely because
an obsolete cron referenced it.

`inngest ^4.11.0` was declared and imported nowhere — no authority requires it. **Removed**;
lockfile synced. A vendor is not adopted because it happens to already be installed.

---

## 7. Experience Shell — brand authority resolved

The repository authority is `verity-app-ui-mockups/`. It is a **themeable prototype**:

```json
"accent": { "default": "#D4A017",
            "options": ["#D4A017","#C39B4E","#0FA894","#4C6FE0","#6C5CE0","#1F9E57"] }
{ name: "Warm Sand Gold", hex: "#D4A017" }
```

Teal (`#0FA894`) *is* among the six sanctioned options, so a teal build was not off-brand in
kind — but the **default and named identity is `#D4A017` Warm Sand Gold**, and the shipped value
(`#0DA191`) was none of the six. **The shell's palette was realigned to the repository
authority.** Composition, layout, typography and the mark were not redesigned.

The mockup's own tokens are now the shell's: `--base` `#F4F4F5`/`#0D0D0F`, `--tx`
`#18181B`/`#ECECEE`, and the semantic set `--ok` `--wn` `--dg` `--info`.

**This also closed the contrast finding.** Gold is a *light* accent: white on `#D4A017` measures
2.38:1, while `#18181B` on it measures **7.46:1**. Dark ink is both correct and AA-passing, so
the documented exception disappeared — and the contrast sweep's exclusion for accent-filled
elements was **removed**, making the sweep strictly stronger than before.

| Check | Status |
|---|---|
| Verity mark geometry | **PROVEN** — approved arcs asserted |
| Wordmark rendered as artwork | **PROVEN** |
| Inter loaded, not a fallback serif | **PROVEN** |
| Light and dark both designed | **PROVEN** |
| No theme script in the document | **PROVEN** |
| AA contrast, every element, both themes | **PROVEN** — no exclusions |
| No fake client data / metrics / capabilities | **PROVEN** — every figure is a counted row |

---

## 8. Arbitrary capability composition — PROVEN

Traced for a hypothetical capability; **not implemented**.

| Concern | Mechanism | Platform change |
|---|---|---|
| Entities / schema | tables + migration | additive |
| Commands / queries | `registerCommand` / `registerQuery` | none |
| State machine + StateCategory | `StateDefinition` rows | none |
| Permissions | `Permission` rows (Verb+Entity+Scope) | none |
| Configuration | `ConfigParameter`, org→tenant→global | none |
| Events / audit | automatic via command runtime | none |
| SLA behaviour | `startClock` / `applyStateToClocks` | none |
| **Scheduled work** | `ScheduleContribution` | **none — closed this session** |
| Evidence / documents | `reserveUpload` / `confirmUpload` | none |
| Notifications | `notify()` | none |
| UI + navigation | `registerContribution` | none |
| Registration | one line in `registry.ts` | additive |

A shipped capability is **one file of 137–263 lines**. Nothing requires modifying tenancy,
authorization, the state runtime, the command runtime, the audit runtime, shell internals, or a
global navigation map. Conformance enforces the boundary rather than trusting it: capabilities
cannot import undeclared dependencies, every capability mutation routes through a command
definition, and no capability sets a tenant scope by hand.

---

## 9. Standardize-foundation principle — PASS

Purpose-built is permitted and used: `Location`, `Asset`, `Evidence`, `Booking` carry **real
typed columns**, not metadata bags. Conformance polices both extremes —
`has no entity-attribute-value table`, `keeps JSON columns to the declared extension points`,
`keeps state machines declared as data, not as code branches`.

The opposite failure ("everything must be configurable") is **not present**: capabilities carry
hard-coded domain logic — `captures evidence and judges it against a geofence at capture time` —
while `registers an asset with no equipment-specific columns` proves platform tables stayed
generic. That is the constitutional split working in both directions.

---

## 10. CI — NEWLY BOUND, UNVERIFIED ON A RUNNER

`.github/workflows/verify.yml` added. Previously there was **no CI at all**, which is why the
Windows build question could be neither confirmed nor dismissed.

It provisions a Postgres 17 service and **creates `verity_app` as `NOSUPERUSER NOBYPASSRLS`** —
creating it as a superuser would make `assertRlsEnforceable` pass vacuously and every isolation
assertion beneath it meaningless. A dedicated step asserts `super=f bypassrls=f` before any test
runs. Then: `typecheck`, `lint`, `test`, `build`.

**Status: IMPLEMENTED, not yet PROVEN** — it has never executed on a runner. First push will
confirm or correct it.

---

## 11. Windows build

Not a repository defect. `prisma generate` installs the query engine by **renaming over**
`query_engine-windows.dll.node`; Windows refuses to rename over a loaded DLL, POSIX permits it.
Running `npm run build` beside `npm run dev` fails on Windows only. No `binaryTargets` pin,
`node_modules` gitignored — each host generates correctly.

Remedy is releasing the lock (`taskkill /F /IM node.exe`), plus Defender/OneDrive exclusions.
**No code change; does not block production (Linux builds) or adding a capability.** The new CI
runs on `ubuntu-latest`, so a Windows runner would be the next step if Windows is a supported
development environment — which is currently undocumented either way.

---

## 12. Remaining items

| Item | Class | Blocks a future capability? |
|---|---|---|
| Scheduler provider adapter | Deployment binding | No — contract proven |
| Storage driver | Deployment binding | No — contract proven |
| Notification transport | Deployment binding | No — contract complete |
| CI first run | Verification | No |
| Windows runner / documented procedure | Developer process | No |
| `Global` permission scope | **DEFERRED BY DESIGN** — needs a security ADR | No |
| `own` permission scope | **DEFERRED BY DESIGN** — in neither Bible nor spec | No |
| Failed sign-in logging | **DEFERRED BY DESIGN** — a decision, not an implementation | No |
| Worker shell (§27) | **DEFERRED BY DESIGN** | No |
| `package.json#prisma` deprecation | Forward compatibility | No |

**Nothing in this table is BLOCKED.** Every item is a provider binding, a verification step, or
a recorded decision.

---

## Verdict

```
FOUNDATION:                    READY
SECURITY:                      READY
EXPERIENCE SHELL:              READY
ARBITRARY MODULE COMPOSITION:  READY
SCHEDULED CAPABILITY SUPPORT:  CONTRACT READY, PROVIDER UNBOUND
STORAGE:                       CONTRACT READY, PROVIDER UNBOUND
NOTIFICATIONS:                 CONTRACT READY, TRANSPORT UNBOUND
CI:                            IMPLEMENTED, AWAITING FIRST RUN
OPERATIONAL READINESS:         NOT READY — provider bindings only
FUTURE CLIENT SYSTEMS:         ALLOWED
```

**Can Verity now safely stop building platform infrastructure and wait for the first real client
requirement?**

# YES

Every remaining item is a **provider binding or a recorded decision, not an architectural gap**.
The last genuine architectural hole — a capability having no way to declare recurring work — was
the one thing that would have forced a platform edit on first contact with a real requirement,
and it is closed at the contract level with vendor neutrality asserted by test.

Continuing to build infrastructure now would mean inventing requirements no authority states and
no client has expressed. The correct next action is to **stop**, and let the first real
requirement decide which provider gets bound, in what order, and whether the cadence vocabulary
needs a fifth value.

**Hand control back to the first real client requirement here.**
