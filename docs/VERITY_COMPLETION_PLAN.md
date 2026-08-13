# Verity Completion Plan

Date: 2026-08-13
Companion to: [VERITY_MODULE_PLATFORM_AUDIT_2026-08-13.md](./VERITY_MODULE_PLATFORM_AUDIT_2026-08-13.md)

This is an implementation plan, not a status claim. Every phase below states what
to build, which files it touches, what test proves it, and what "done" means. A
phase is not done because the code exists; it is done when its exit criterion is
demonstrably true.

---

## Phase 0 — Repair the build (blocking, before anything else)

**`main` does not compile.** `npx tsc --noEmit` reports **122 errors** across five
files. The breaking commit is `0aa3ff4 feat(platform): enforce strict route/action
entitlement guards and blank tenant boundaries`, and it is pushed to `origin/main`.

The cause is mechanical and consistent: entitlement guards were inserted into the
**parameter type literal** of each action instead of its body.

```ts
// src/server/actions/dispatch.ts — as committed
export async function createDispatch(data: {
  await guardModuleWrite("sales");   // <- inside the type literal
  salesOrderId: string;
  destinationType: "WAREHOUSE" | "STORE" | "CUSTOMER";
}) {
  const user = await getOwnerUser();
```

```ts
// correct
export async function createDispatch(data: {
  salesOrderId: string;
  destinationType: "WAREHOUSE" | "STORE" | "CUSTOMER";
}) {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await guardModuleWrite("sales");
```

Affected files and guard-call counts:

| File | Guard calls to relocate |
| --- | --- |
| `src/server/actions/purchase.ts` | 17 |
| `src/server/actions/inventory.ts` | 12 |
| `src/server/actions/orders.ts` | 10 |
| `src/server/actions/production.ts` | 10 |
| `src/server/actions/dispatch.ts` | 5 |

A second defect rides along: `src/server/actions/tables.ts` calls
`guardModuleAction(...)` but imports only `guardModuleWrite`. It is masked because
`tsc` stops at the parse errors above.

### Work

1. For each of the five files, move every misplaced guard to the first line of the
   function body **after** the session check, so an unauthenticated caller gets
   `Unauthorized` rather than a module error that leaks which modules exist.
2. Fix the `tables.ts` import.
3. Re-run `npx tsc --noEmit`, `npm run build`, `npx eslint src`, `npx vitest run`.

### Exit criterion

`tsc` reports 0 errors, the build compiles, lint holds at 0 errors, and the full
suite is green on three consecutive runs (the suite writes to a shared database and
has produced order-dependent failures before).

### Guard against recurrence

Add `src/server/actions/guard-placement.test.ts`: for every `"use server"` module,
assert that no `guardModule*` call appears between a function's `(` and its
matching `) {`. This is the check that would have caught the commit before it
shipped, and it costs nothing to run.

---

## Phase 1 — Make disabling real

Audit P0. The vision's Scenario E: *"Tasks disappears from UI, API also blocks
access."*

### Current measured coverage

- **Owner pages:** 46 total, **23 guarded**, 23 unguarded.
- **Action modules:** 64 total (excluding tests), **22 carry a guard**, 42 do not.

Not every unguarded surface is a defect. These are legitimately core-owned and must
stay reachable on a blank tenant:

`/owner/dashboard`, `/owner/settings`, `/owner/settings/*`, `/owner/team`,
`/owner/team/[id]`, `/owner/users*`, `/owner/departments`, `/owner/search`,
`/owner/page.tsx`, `/owner/system/storage`.

These are module-owned and currently unguarded:

| Route | Owning module |
| --- | --- |
| `/owner/master-data`, `/owner/settings/master-data/*` | `core` if cross-module config; `inventory` if it is item data — **decide first** |
| `/owner/reports` | `core` (reads many modules) — needs a per-section guard, not a page guard |
| `/owner/review/[id]` | `quality` |
| `/owner/floor/[id]` | `manufacturing` |
| `/owner/production/label/[id]` | `manufacturing` |
| `/owner/inventory/labels` | `inventory` |
| `/owner/settings/blueprint/[itemId]` | `manufacturing` |
| `/owner/settings/integrations` | `core` (tenant-level), gated on `settings.access` |
| `/owner/settings/billing` | `billing` |

### Work

1. **Write the ownership matrix first, as data.** `src/platform/modules/ownership.ts`
   exporting `ROUTE_MODULE: Record<string, ModuleKey | "core">` and
   `ACTION_MODULE: Record<string, ModuleKey | "core">`. A matrix in a file can be
   tested; a matrix in a reviewer's head cannot.
2. Add `guardModulePage(...)` to every module-owned page.
3. Add `guardModuleAction` (reads) / `guardModuleWrite` (writes) to every
   module-owned action. Reads use `Action`, writes use `Write` — a read-only
   subscription must still be able to look at its own data.
4. **Order matters inside every guarded function:** session check, then module
   guard, then tenancy-scoped query. Guarding before authenticating tells an
   anonymous caller which modules a tenant has.

### Tests

- `guard-coverage.test.ts` — every route/action in the ownership matrix has a
  guard; every guard names a module that exists in the registry.
- `module-disable.test.ts` — with `inventory` disabled for a fixture org: the page
  redirects, every `inventory` action throws, and **the rows are still in the
  database**. Data retention is the half that makes disable safe to try.

### Exit criterion

Scenario E demonstrably works for `inventory`, `manufacturing`, `quality`, and one
service module — page blocked, action throws, data intact.

---

## Phase 2 — Prove the blank tenant

Audit P1. Currently unproven, and two things actively prevent it.

**Blocker A — provisioning defaults to business modules.** `DEFAULT_MODULES` in
`src/platform/tenancy/packs.ts` is `core, inventory, manufacturing, quality,
procurement, sales, hr`. A tenant created without an explicit module list gets a
manufacturing workspace.

**Blocker B — "unknown means allow".** `resolveNavItems` treats
`enabledModules === undefined` as *show everything*. That was a deliberate
backward-compatibility choice and it is the exact inversion of a platform
guarantee: a failed entitlement lookup opens the whole nav.

### Work

1. Split the default: `provisionClient` takes `modules` explicitly and defaults to
   `["core"]`. Keep `DEFAULT_MODULES` only as the value the **onboarding wizard**
   offers, never as a silent fallback in the provisioning path.
2. Add a blank-tenant fixture: organization + factory + owner user, `core` only, no
   seeded domain data.
3. Change `enabledModules === undefined` from *allow* to *deny*, once every caller
   passes a real list. Do it in that order — flipping first breaks every page whose
   caller was not migrated.
4. Render a configured-empty dashboard state: "No modules enabled yet" with a link
   to HQ, not a blank screen and not a factory floor.

### Tests

`blank-tenant.test.ts`:

- the portal renders,
- nav contains only core destinations,
- every optional module route blocks,
- every optional module action throws,
- no `ItemMaster`, `Department`, `ChecklistTemplate` or menu rows exist.

### Exit criterion

Scenario A works with no code changes and no manual cleanup.

---

## Phase 3 — Compose the dashboard from modules

Audit P0. `src/app/owner/dashboard/page.tsx` is a seven-branch switch over
`resolvePackKey(factory.industry)`. Adding a vertical means editing shared code,
and a blank or custom-composed tenant cannot produce a dashboard at all.

### Work

1. Add `dashboardWidgets?: ModuleDashboardWidget[]` to `ModuleDefinition`:
   ```ts
   interface ModuleDashboardWidget {
     key: string;
     title: string;
     /** Registry permission required to see it. */
     requires: string;
     /** Layout hint: "metric" | "panel" | "wide". */
     size: "metric" | "panel" | "wide";
     /** Server component, loaded lazily so a disabled module ships no code. */
     load: () => Promise<{ default: React.ComponentType<WidgetProps> }>;
     sortOrder?: number;
   }
   ```
2. Build `resolveDashboardWidgets(ctx)` beside `resolveNavItems` — same four gates,
   same file neighbourhood, tested the same way.
3. Decompose the six existing vertical dashboards into widgets owned by the module
   whose data they read. The entitlement test already knows which module owns which
   model; that map is the decomposition guide.
4. Keep vertical dashboards temporarily as **pack-level widget orderings**, not as
   components. A pack says which widgets lead; it does not own a screen.

### Tests

- Two fixture tenants with different module sets resolve different widget lists.
- A widget whose permission the user lacks is absent, not empty.
- A blank tenant resolves zero widgets and renders the configured-empty state.
- Extend `pack-entitlements.test.ts`: a widget may only query models its owning
  module owns.

### Exit criterion

Two tenants with different module sets see different dashboards, and neither
required an edit to `dashboard/page.tsx`.

---

## Phase 4 — Retire the legacy permission union

Audit P1, and a prerequisite for Phase 5 rather than an optional cleanup.

`src/lib/permissions.ts` is marked deprecated but still load-bearing:
`resolveNavItems` gate 3 calls `ctx.can(item.permission)`, so **every** nav item
must still name a VEDA-era permission. Restaurant modules currently declare
`permission: "QC_QUEUE"` purely to pass a gate that has nothing to do with them.
That is a lie in the registry, and it will be copied by the next module author.

### Work

1. Inventory every `ModuleNavItem.permission` value and its registry equivalent in
   `requires`. Where `requires` is already correct, the legacy value is dead weight.
2. Migrate remaining `can(...)` call sites to `resolveAccess()` / `requirePermission()`.
3. Make `permission` optional in `ModuleNavItem`, then remove it.
4. Delete gate 3 from `resolveNavItems`. Registry permissions become the only
   source of truth.
5. Delete `src/lib/permissions.ts` and the `Permission` union.

### Exit criterion

No module declares a permission it does not own. `grep -r "QC_QUEUE" src/platform`
returns nothing.

---

## Phase 5 — Module SDK pilot

Audit P0 ("no real module package/SDK boundary").

> **Conflict to resolve before starting.** [PRD 03](./prd/03-module-contract.md) is
> marked **DEFERRED — DO NOT IMPLEMENT** until PRD 02, 04 and 06 ship, and
> explicitly forbids `src/modules/<key>/` restructuring. The audit asks for the
> opposite, now. Both cannot be followed.
>
> **Recommendation:** honour the deferral for the *external developer platform*
> (scaffolding CLI, import-boundary lints, module store) and take only the internal
> half now — a `createModule()` shape and a test harness for one pilot. That is what
> Phases 1–3 need in order to stay honest, and it is not the thing PRD 03 defers.
> **This needs an explicit decision; do not let an agent pick silently.**

### Work (internal half only)

1. `createModule()` returning a validated `ModuleDefinition` — one function, no
   folder restructuring, no CLI.
2. Pick **one** pilot. `helpdesk`, `assets` or `projects` — newer, already guarded,
   not tangled with VEDA. **Not** manufacturing.
3. Give the pilot: manifest, owned permissions, nav, dashboard widgets, page and
   action guards, and a harness that tests install → use → disable → re-enable →
   permission denial → tenant isolation.

### Exit criterion

The pilot can be installed and removed for two blank tenants with no edit to shell,
route, dashboard or permission code.

---

## Phase 6 — Extract VEDA / manufacturing

Audit P0 ("Core still carries VEDA/manufacturing concepts"). Last, because it is
the largest and every earlier phase reduces its blast radius.

### Work

1. Classify every schema model and app surface into: Core platform / horizontal
   module / manufacturing module / restaurant module / debt. Write the
   classification down before moving a single file.
2. Move manufacturing-owned routes, actions and components behind the
   `manufacturing` module boundary established in Phase 5.
3. Remove automotive and Carxen assumptions from Core copy and settings.
4. **Do not rename `Factory` yet.** It is the tenant workspace model with
   `factoryId` on ~60 tables and in every tenancy filter in the codebase. Renaming
   it is a separate, mechanical, high-risk change that should happen on its own,
   with no feature work in the same commit.

### Exit criterion

Core can provision a restaurant, a service business or a blank tenant with no
production, QC or factory concepts reaching the portal.

---

## Sequencing

```
Phase 0  Repair build          ← done
Phase 1  Guard coverage        ← done
Phase 2  Blank tenant          ← in progress
Phase 4  Kill legacy perms     ← in progress (pre-requisite for widgets/modules)
Phase 3  Dashboard widgets     ← depends on 2 and 4
Phase 5  SDK pilot             ← depends on 4; DECISION: internal SDK only, defer external
Phase 6  VEDA extraction       ← depends on 5
```

---

## Standing constraints

These are not new; they have each already caused a defect in this repo.

- **`db push`, never `migrate dev`.** See [MIGRATIONS.md](./MIGRATIONS.md). The
  migration history is incomplete and `migrate dev` will offer a reset against a
  live database.
- **`"use server"` modules may export only async functions.** A constant export
  passes `tsc` and fails the build with an error that names the importer.
  `use-server-exports.test.ts` guards this.
- **Tenancy comes from the session, never from an argument.** Every export in a
  `"use server"` file is a public POST endpoint.
- **The test suite shares one database and runs files in parallel.** Characterisation
  tests must filter to their own fixtures; two order-dependent failures have already
  been traced to this.
- **Money is integer paise.** Prices on historical records are snapshotted, never
  read through to a live price.

---

## Deliberately out of scope

- Renaming `Factory` (Phase 6 note).
- The external developer platform: CLI, module store, import-boundary lints —
  deferred by PRD 03.
- New verticals or modules. The audit's bottom line stands: the next phase is not
  "build more modules."

---

## Decisions Logged

| # | Decision | Status | Detail |
| --- | --- | --- | --- |
| 1 | Internal SDK now, or honour PRD 03's deferral in full? | **Resolved** | Internal `createModule()` shape and pilot harness only; defer external platform. |
| 2 | Is `/owner/master-data` core config, or `inventory` data? | **Deferred** | Kept core/deferred for now until Phase 6 extraction. |
| 3 | Is `/owner/reports` core with per-section guards, or module-owned? | **Deferred** | Kept core/deferred for now. |
| 4 | Does a blank tenant get `hr`? | **Deferred** | Kept core/deferred for now. |
| 5 | Manager `purchase_order` backfill | **Resolved** | Grant `purchase_order.create`. Added `ponytail:` comment identifying need for split when `purchase_order.view` is added. |
| 6 | Co-Owner equivalence | **Resolved** | Mirror Owner permissions exactly to make them explicit and auditable. |
| 7 | Supervisor team.manage backfill | **Resolved** | Do not grant `team.manage`. Rationale: lacks scoped alternative. Logged in WITHHELD. |

