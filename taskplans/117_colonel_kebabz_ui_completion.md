# Task Plan 117 — Colonel Kebabz UI completion (CRM/Loyalty/Coupon/Complaint/Attendance/Finance/Recipe)

Authority: `clients/colonel-kebabz/phase-plan.md` (Phases 1–5, all marked
SHIPPED backend-only), `clients/colonel-kebabz/prd.md`, `feedback_lean_v1_scope`
memory (build the minimum modules the client's team actually needs — this
taskplan stays inside that lean scope, it only finishes wiring what Phases
1–5 already built).

## Status: IN PROGRESS (2026-09-20)

**BUILT and `tsc --noEmit` clean across the whole project** (verified after
every commit, not just at the end):
- Phase 0 — `/customers` collision fixed (crm moved to `/guests`).
- Phase 1 — `/guests` list + `/guests/[customerId]` detail (`crm`).
- Phase 2 — loyalty balance + redeem folded into guest detail (`loyalty`).
- Phase 4 (folded in) — complaint history + file-complaint on guest detail,
  plus a standalone `/complaints` queue with status/resolve actions
  (`complaint.listComplaints` gained an optional `customerId` filter —
  additive, no existing caller changed).
- Phase 5 — `/attendance` dashboard + per-employee mark-attendance board
  (`attendance`). Not built: payroll-inputs report view, shift-definitions
  admin list — both listed in the phase's own scope, deferred here for time.
- Phase 3 — `/coupons` list + create form (`coupon`). Required adding
  `listCoupons` (the capability had zero read query — flagged in the
  finding table above, not scope creep) and a nav entry (the capability had
  none). `apply_coupon`'s counter/bill wiring not checked — still an open
  item per the phase's own note.
- Phase 6 — `/expenses` list + record + approve/reject (`finance`). Not
  built: `/cash-reconciliation`, `/outlet-pnl` — both use commands/queries
  that already exist (`record_cash_reconciliation`, `get_outlet_pnl`),
  deferred for time, same pattern as `/expenses` to follow.
- Phase 7 — `/recipes` menu analytics (quadrant table, last 30 days). Not
  built: the per-item recipe/BOM authoring panel on `/menu` (`save_recipe`,
  `set_recipe_active`) — needs `MenuAdmin.tsx` read first, per the phase's
  own note.

**Verification run:** `tsc --noEmit` clean after every phase's commit.
`vitest run` on the three capability suites touched
(`capability-{crm,complaint,coupon}.test.ts`) fails in this environment on
a pre-existing `E_CONFIG_INVALID` (no `DATABASE_URL` here) — an
environmental limitation this repo has hit before (Task 106's own "5
pre-existing environmental failures on the remote DB"), not a regression
from this session's edits. No real logged-in run against the Colonel
Kebabz tenant performed this session — still open, per this file's own
Verification section.

**Remaining for a future session:** Attendance payroll-inputs report +
shift admin, `/cash-reconciliation` + `/outlet-pnl` routes, coupon
application at the counter, recipe/BOM authoring on `/menu`, and the real
logged-in verification pass every phase's own Verification bullet calls
for.

## Trigger / finding that opened this taskplan

User asked for an Odoo-lens usability audit of plywood, PlotArmour Outreach,
and Colonel Kebabz. Finding: plywood and Outreach are real modular apps
(backend + operator UI + navigable flow, both already usability-audited).
Colonel Kebabz is not — 7 capabilities shipped in `phase-plan.md` as
"SHIPPED" only shipped a backend + unit test:

**Corrected during Phase 0 investigation** (the first pass's `src/app` grep
missed brace-glob nav registrations — actual state is worse than "no UI"
for four of these: a nav entry exists and 404s):

| Capability | Commands/queries that exist | Nav registered at | Page exists? |
|---|---|---|---|
| `recipe` | save_recipe, set_recipe_active, get_recipe_cost, get_menu_analytics | `/recipes` (Inventory group) | **no — 404** |
| `crm` | get_customer_360, list_customers | `/customers` | **collides** — plywood's page.tsx serves that route with plywood's own `listCustomers`; crm's nav entry silently loses |
| `loyalty` | redeem_points, get_balance | none (by design — no independent list) | n/a, folds into guest detail |
| `coupon` | create_coupon, apply_coupon | **none — missing**, and **no `listCoupons` query exists either** | no |
| `complaint` | file_complaint, update_status, resolve, list | `/complaints` (Overview group) | **no — 404** |
| `attendance` | record_attendance, get_dashboard, get_payroll_inputs, define_shift, list_shifts | `/attendance` (Administration group) | **no — 404** |
| `finance` | record_expense, decide_expense, list_expenses, record_cash_reconciliation, get_outlet_pnl | `/expenses` (Money group) only — cash reconciliation and P&L have no nav entry of their own | **no — 404** |

Two real defects, not one: the `crm`/plywood `/customers` collision (two
`registerContribution` calls target the same href, whichever page.tsx exists
wins silently — fixed in Phase 0), and `coupon` shipped with zero nav and no
read query at all (list screen is impossible without one — Phase 3 adds a
minimal `listCoupons` query, same shape as every sibling capability's list
query, not new scope).

## Non-goals

- No new backend commands/queries. Phases 1–5 of `phase-plan.md` already
  built everything this taskplan wires up. If a screen needs a query that
  doesn't exist, that is a gap to flag back to `phase-plan.md`, not something
  to add here silently.
- No marketing campaigns, review aggregation, franchise, loyalty tiers,
  delivery-platform reconciliation, payroll wage rates — all explicitly
  deferred in `phase-plan.md` for a stated reason (blocked on a
  product-owner/external decision). Out of scope here too.
- No redesign of plywood's or Outreach's existing screens. This taskplan only
  adds Colonel Kebabz's missing screens, in the same design system (ADR-024/
  ADR-026, `impeccable`) already governing every other screen — not a new
  visual language.

## Design/pattern authority for every phase

Every screen below follows the pattern already established by
`src/app/(shell)/assets/page.tsx` + `assets/[id]/AssetActions.tsx`:
- List screens: `withCapabilityPageAccess(CAPABILITY, Page)` wrapping a
  server component, `StatRow`/`Stat` for the opening real-data band,
  `DataTable` for the row list (`variant: "link"` / `"state"` columns),
  `DemoDataNotice` when appropriate.
- Mutations: a `"use client"` panel/form calling `runCommand(key, input,
  revalidatePath)` from `@/server/actions/platform`, rendering
  `ErrorState` on `ActionFailure`, `CommandButton` for permission-gated
  single-click transitions (see `outreach/NewLeadForm.tsx`,
  `assets/[id]/AssetActions.tsx`).
- Navigation: each capability's own `registerContribution` call, `group`
  and `icon` chosen to sit sensibly among Colonel Kebabz's existing
  Overview/Capabilities groups — never a new top-level group for a single
  link.
- Material: `PageHeader` + solid dense content (ADR-023/026 — lists,
  tables, forms stay `.verity-solid`; no glass on rows/badges).

`impeccable` governs craft on every one of these — invoke it before writing
new component code, not just once for this taskplan.

## Phase 0 — Fix the `/customers` collision

- Confirm crm's own `getCustomer360`/`listCustomers` are Colonel-Kebabz-only
  (walk-in `Customer`, phone-matched) and plywood's are B2B trading parties
  (`Party`-backed). They are genuinely different entities serving different
  tenant types — not a duplicate to merge.
- Give crm's nav contribution its own route: `/guests` (a walk-in diner is
  not a B2B "customer" in Colonel Kebabz's own vocabulary either — avoids
  colliding with the platform's canonical `Party`/trading meaning of
  "customer"). Update `registerCrmCapability`'s `href` and `label` ("Guests").
  Leave plywood's `/customers` untouched.
- Build `/guests/page.tsx` (list, segment stat row: total guests, repeat
  guests ≥2 visits, avg spend) and `/guests/[customerId]/page.tsx` (Customer
  360: aggregates + loyalty balance + complaint history, wiring in Phases
  2–4 below).

## Phase 1 — CRM (`/guests`, `/guests/[customerId]`)

`getCustomer360`, `listCustomers`. List page + segment filters
(minSpend/minVisits/daysSinceLastOrder query params, matching the existing
query's own filter shape). Detail page: identity, aggregates, and slots for
the loyalty balance panel (Phase 2) and complaint history (Phase 4) —
built here as empty slots, filled in those phases so this phase doesn't
block on them.

## Phase 2 — Loyalty (folded into `/guests/[customerId]`, no separate route)

`get_balance`, `redeem_points`. A points-balance `Stat` plus a redeem form
(points amount, reason) on the guest detail page — loyalty has no
independent list worth a top-level nav entry; it is always viewed per-guest.
No new nav contribution beyond what Phase 0 already added.

## Phase 3 — Coupons (`/coupons`)

`create_coupon`, `apply_coupon`. List page (active/expired `Stat`s,
DataTable of codes/type/value/expiry), create-coupon panel (percent/flat
only, matching what was actually built — no Buy-X-Get-Y, no scoping, per
`phase-plan.md`'s own stated cut). `apply_coupon` is exercised at the
counter/bill flow, not this admin screen — confirm during Phase 3 whether
`counter`'s `BillView.tsx` already has a coupon-code field; if not, that's
a real gap to note (counter is dinein's screen, may be out of this
taskplan's reuse-only scope — flag rather than silently extend dinein).

## Phase 4 — Complaints (`/complaints`)

`file_complaint`, `update_status`, `resolve`, `list`. Queue page (open/
in-progress/resolved `Stat`s), `DataTable` with state-variant status column,
file-complaint form (from this screen and, per Phase 1's slot, from
`/guests/[customerId]`), resolve/update-status actions via `CommandButton`
matching `AssetActions.tsx`'s state-transition pattern exactly (complaint's
own state category, not a copy-pasted asset one).

## Phase 5 — Attendance (`/attendance`)

`record_attendance`, `get_dashboard`, `get_payroll_inputs`, `define_shift`,
`list_shifts`. Dashboard page (today's check-ins by outlet), a payroll-inputs
report view (days worked/hours/late-absent-leave counts per employee, per
`phase-plan.md`'s stated derived-at-query-time posture — no new stored
entity), shift definitions as a small admin list under this same route
(no separate nav entry — shifts have no independent nav-worthy list either).

## Phase 6 — Finance (`/expenses`, `/cash-reconciliation`, `/outlet-pnl`)

`record_expense`, `decide_expense`, `list_expenses`,
`record_cash_reconciliation`, `get_outlet_pnl`. Three routes, not one
"Finance" collision with plywood's own `/finance` (ledger/invoices — a
different capability, different entity, same collision risk Phase 0 fixed
for crm). Expenses: list + approve/reject `CommandButton`s
(`decide_expense`'s binary verdict). Cash reconciliation: a per-outlet daily
entry form (variance requires an explanation per the capability's own
validation). Outlet P&L: read-only report page, `Stat`s for revenue/COGS/
gross margin, and the capability's own `cogsIsApproximate`/`note` fields
rendered as a visible caveat banner — never presented as an exact number the
capability itself says it isn't.

## Phase 7 — Recipe / Menu Analytics (`/menu-analytics`)

`get_menu_analytics` (Star/Plow Horse/Puzzle/Dog quadrant), `get_recipe_cost`
surfaced per item. One report page: DataTable grouped/badge by quadrant.
`save_recipe`/`set_recipe_active` (defining a recipe/BOM against a MenuItem)
belongs on `/menu`'s existing `MenuAdmin.tsx` as an extra panel per item, not
a new top-level route — confirm `MenuAdmin.tsx`'s current shape before
adding; if it's already dense, a `/menu/[itemId]/recipe` sub-route is the
fallback, decided during that phase, not pre-decided here.

## Sequencing

Phase 0 blocks everything (fixes the collision new nav entries would
otherwise repeat). Phases 1→2→4 are sequential (guest detail page needs to
exist before loyalty/complaint panels slot into it). Phases 3, 5, 6, 7 are
independent of each other and of 1/2/4 — safe to build in any order or in
parallel once Phase 0 and Phase 1's list page exist.

## Verification

Each phase: `tsc --noEmit` clean, capability's existing Vitest suite still
green (`capability-{crm,loyalty,coupon,complaint,attendance,finance,recipe}.test.ts`
already exist and pass per `phase-plan.md` — this taskplan must not break
them), then a real logged-in run against the Colonel Kebabz tenant per
screen (`superpowers:verification-before-completion` posture — code
compiling is not completion per this repo's own CLAUDE.md).
