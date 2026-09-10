# Colonel Kebabz — Phase Plan

**Status:** Draft, for review
**Date:** 2026-09-10
**Purpose:** Map the PRD's remaining scope (`clients/colonel-kebabz/prd.md`) onto
Verity's existing capabilities, so each future slice reuses what already
exists instead of forking. Companion to
`docs/superpowers/specs/2026-09-10-colonel-kebabz-multi-outlet-dinein-design.md`
(Phase 0, shipped).

## Capability inventory (what already exists)

| Capability | Registered? | What it does | Restaurant fit |
|---|---|---|---|
| `dinein` | yes | Menu, floor, order→kitchen→bill→pay, GST, day summary | Built for exactly this — now multi-outlet |
| `location` | yes | Place/Address/Location/Geofence, Location-scoped permission axis | Outlet backbone — already in use |
| `trading` | yes (standalone since 2026-09-10) | Vendors, purchase/sales orders, GRN, invoices, payments, GST, stock ledger | Procurement (§21–27) — generic, godown-terminology not restaurant-terminology |
| `inventory` | yes | Item groups, items, Location-scoped stock balance + cost, append-only movement ledger | Stock/ledger (§17–20) — already Location-scoped like `dinein` now is |
| `recipe` | yes (new, 2026-09-10) | Recipe/BOM per MenuItem, food-cost query, posts theoretical consumption on order settlement | Recipe Management / BOM / Food Cost (§14–16) |
| `hr` | yes | Departments, employees (wraps Party), leave types/applications | Staff + leave (§38, §41) only — no attendance/shifts/payroll |
| `approval` | yes | Generic role-based sequential approval chains on any entity | Approval Engine (§73) directly — expense/PO/discount/refund thresholds |
| `evidence` | yes | Immutable photo/GPS/signature capture tied to a geofence | Wastage photos (§20), audit photos (§53) — zero fork needed |
| `asset` | yes | Named assets, optional Location, no domain columns | Kitchen equipment tracking — not a current priority |
| `billing` | yes | Meters + periodic readings + flat-rate invoicing of a Party | Closer fit for franchise royalty (§51) than day-to-day sales |
| `scheduling` | yes | Resource (Party/Asset) + Booking, conflict-checked | Not an obvious fit — dine-in doesn't need calendar booking |

## Phase 0 — Multi-outlet dine-in (SHIPPED, 2026-09-10)

`dinein` gained `locationId` scoping; Colonel Kebabz bootstrapped as a live
tenant (3 outlets, shared menu, owner login). See the Slice 1 design spec for
detail. **Known gaps carried forward from that slice:**
- No UI outlet-switcher yet — `/floor`, `/kitchen`, `/counter`, `/reports`
  currently show all 3 outlets combined for a Tenant-scoped actor.
- No per-outlet menu/price override (PRD §118).

## Phase 1 — Procurement & Inventory (mostly reuse)

**DECIDED (2026-09-10) — Trading:** `trading` audited. Zero plywood import
dependency exists in `src/server/capabilities/trading/*` — every `plywood`
string match is a doc comment, not code coupling. Direction runs the other
way: `plywood/index.ts` imports and calls `registerTradingCapability()` as
composition. `trading` is already a clean, standalone-registerable
capability; the only gap is `registry.ts` calling
`registerPlywoodCapability()` but not `registerTradingCapability()` at
top level. Fix is a registry wiring addition, not an extraction — no fork,
no thin restaurant-specific layer needed. Covers §21–26 (Purchase Requests,
POs, GRN, Vendor Management, Price History) as-is; restaurant terminology
(vendor/GRN language vs. godown language) is a display-label concern, not
a schema fork.

**DECIDED (2026-09-10) — Recipe/BOM placement:** Recipe/BOM lives in the
Inventory/Procurement domain, not `dinein`. `MenuItem` (what's sold) stays
in `dinein`; `Recipe`/`BOM` (what's consumed to produce it) is new, owned
alongside `inventory.Item` (what's stocked), referencing `dinein.MenuItem`
by id rather than the reverse. Chain: MenuItem → Recipe/BOM → Ingredient →
Inventory → Stock Ledger. Consumption chain: Completed Order → Recipe/BOM →
Theoretical Consumption → Inventory Ledger → Food Cost/Variance. This
makes Recipe/BOM the load-bearing abstraction for food cost, wastage
variance, forecasting, and AI procurement in later phases — do not let it
drift into a `dinein`-owned concept.

**SHIPPED (2026-09-10) — Recipe-driven theoretical consumption** (§14–16:
Recipe, BOM, Food Cost). New `recipe` capability: `saveRecipe`/
`setRecipeActive`/`getRecipeCost`, plus `postConsumptionForOrder` called
from `dinein.settle_bill` — the `ORDER COMPLETED → Inventory Consumption`
chain PRD §128 names. Tested end to end in
`src/test/capability-recipe.test.ts` (recipe cost query + a full seat →
order → serve → bill → settle flow asserting the correct ingredient
quantity was debited from `inventory`'s ledger).

**Follow-ups, not blocking, noted for later:**
- Food cost % is only computable once `InventoryItem.avgUnitCostPaise` is
  populated — no command currently threads a unit cost through
  `inventory.recordStockMovement`'s Receipt path (the field exists on the
  model; the command's input doesn't accept it yet). Needed before §16's
  variance report is meaningful, not before Recipe/BOM itself. **SHIPPED
  2026-09-10** — `recordStockMovement` now accepts `unitCostPaise` on a
  Receipt and folds it into `InventoryItem.avgUnitCostPaise` as a
  quantity-weighted moving average across every location. `getRecipeCost`
  now returns real numbers (tested: 21.44% food cost on the fixture recipe).
- §16's theoretical-vs-actual variance report itself (Opening + Purchases -
  Closing vs. recipe-derived expected consumption) is not built — this
  slice only posts the consumption side of that ledger.
- Trading's own GRN command chain doesn't yet route ingredient receipts
  into `inventory` (the ledger-ownership decision below) — still posts to
  `trading`'s separate ledger. Needed before Colonel Kebabz can receive
  ingredient stock through a real PO/GRN flow rather than the test's direct
  `recordStockMovement` calls.
- Migration-drift incident hit and resolved during this slice: a
  pre-existing dead rolled-back row in `_prisma_migrations` for
  `20260904180000_trading_capability_extraction` blocked `migrate dev`;
  cleared via the product owner running a targeted `DELETE` in an
  unrestricted session (per `verity-migration-safety`'s own incident
  playbook). Separately, that same migration's file still doesn't fully
  match live DB state — `prisma migrate diff` shows ~600 lines of pending
  `plywood_*` → `trading_*` constraint renames and index changes never
  applied. Untouched by this slice (isolated out of the hand-written
  Recipe/BOM migration deliberately) but real, unresolved drift — worth its
  own dedicated pass before it surprises a future `migrate dev`.
- **DECIDED (2026-09-10) — ingredient ledger ownership:** `inventory` owns
  quantity AND cost for ingredients (`InventoryItem.avgUnitCostPaise`,
  `InventoryStockMovement.unitCostPaise`), extending Task 73's original
  quantity-only scope. Procurement (GRN) and consumption (recipe) post to
  the same ledger — not `trading`'s separate one — so there is one number
  for stock and cost, not two that can drift.
- **SHIPPED (2026-09-10) — Wastage** (§20). New `recordWastage` command in
  `inventory`: posts an Adjustment movement plus a companion
  `InventoryWastageRecord` (reason from PRD §20's own closed list, a
  `valuePaise` snapshot computed from `avgUnitCostPaise` at record time,
  notes, optional `evidenceId`). Append-only (ADR-009). Tested. Not built:
  approval-if-required — no threshold has been decided (open decision, not
  a silent gap).

## Phase 1 status: SHIPPED (2026-09-10)

Recipe/BOM, food cost, and wastage all built and tested
(`src/test/capability-recipe.test.ts`, 3 passing tests covering cost query,
order→consumption, and wastage). `trading` standalone-registered. Remaining
Phase 1 follow-ups (§16 variance report, GRN→inventory routing, the
pre-existing unrelated migration drift) are tracked above as explicit
non-blocking items, not silently deferred.

## Scope correction (2026-09-10, product owner)

Colonel Kebabz does not need the PRD's full ERP depth right now — build the
minimum modules/workflows the client's team actually needs, lean and
functional, extensible later rather than deep now. Applies to every
remaining phase below: skip derived analytics, advanced workflows,
forecasting, and speculative config until there's a real trigger for them.
Recorded as a standing memory (`feedback_lean_v1_scope`) so it isn't
re-litigated per phase.

## Phase 2 — CRM & Loyalty (in progress, lean V1)

**SHIPPED (2026-09-10) — Customer/360** (§28-30: Customer CRM, Customer
360, Segmentation). New `crm` capability, `Customer` as a new tenant-scoped
identity — deliberately NOT a Party (ADR-001/ADR-007 sidestepped entirely,
not extended). Matched by phone, shared across outlets. Auto-upserted from
`dinein.generateBill` (same posture as recipe's consumption hook: a plain
function call under an existing authorized command, not a second command).
Spend/visits/AOV/last-order computed live from settled Bills — never
cached. Segmentation is query filters (`minSpendMinor`/`minVisits`/
`daysSinceLastOrder`/`locationId`), not a stored segment table or rules
engine. Design: `docs/superpowers/specs/2026-09-10-colonel-kebabz-customer-
360-design.md`. Tested: `src/test/capability-crm.test.ts` (two visits, one
Customer, correct aggregates, segment filter). Backfill script for
Colonel Kebabz's pre-existing order history:
`prisma/backfill-crm-customers.ts` (idempotent, not yet run against the
live tenant — run when ready).

**Dropped from V1 per the lean-scope correction** — not silently missing,
explicitly deferred: `preferredChannel`, `anniversary` fields (plain
columns, trivial to add when campaigns/birthday-automation exist);
"favourite items" derivation (real per-item aggregation, no consumer yet).

**SHIPPED (2026-09-10) — Loyalty** (§31, points only — see Phase 2's own
entry above, and `src/server/capabilities/loyalty/`).

**SHIPPED (2026-09-10) — Coupons** (§32, percent/flat codes only — see
`src/server/capabilities/coupon/`).

**SHIPPED (2026-09-10) — Complaints + Service Recovery** (§36-37 — see
`src/server/capabilities/complaint/`). `approval` was NOT wired in this
cycle — no compensation threshold has been decided; still reusable once one
is.

## Phase 2 status: lean-V1 core SHIPPED (2026-09-10)

Customer/360, Loyalty, Coupons, Complaints/Service Recovery all built and
tested (`capability-crm.test.ts`, `capability-coupon.test.ts`,
`capability-complaint.test.ts`). Not built, by explicit choice:

- Marketing Calendar (§34) — a plain list of dates already knowable from
  existing data (Coupon.expiresAt, complaint dates); no consumer asking for
  a dedicated calendar view yet, so not built ahead of that need.
- Marketing Campaigns (§33) — **blocked on a product-owner decision**: which
  WhatsApp/SMS/email provider, and its credentials.
- Review aggregation (§35) — **blocked on a product-owner decision**: Google
  Reviews / delivery-platform API access.
- Loyalty tiers, rewards catalogue, birthday/anniversary automation, visit
  rewards — dropped per the lean-scope correction; points-only ledger is V1.
- Coupon types beyond Percent/Flat (Buy-X-Get-Y, item/category-scoped,
  first-order, returning-customer, outlet-specific, time-specific) — same.

## Phase 3 — People & Franchise

**Reuse:** `hr` for employees, departments, leave (§38, §41) — activate as-is.

**SHIPPED (2026-09-10) — Attendance + Shifts + Payroll Inputs** (§39-40,
42). New `attendance` capability, sibling to `hr` not a fork (Task 78's own
header comment excludes this scope). `AttendanceRecord` upserted per
employee per day (a second check-in the same day corrects the row, no
duplicate). Payroll inputs (days worked, hours from check-in/out, late/
absent/leave counts) computed at query time — never a stored payroll
entity, matching every other derived-data convention this project uses.
Dropped this cycle: overtime as a distinct figure, late deductions,
incentives, advances, shift-gap detection (needs a shift-template concept
nothing asks for yet). Tested: `src/test/capability-attendance.test.ts`.

**NOT BUILT — Franchise** (§50-53: partner, agreement, territory, royalty,
compliance, audits). Deliberately not building this: Colonel Kebabz's three
outlets are centrally owned (Phase 0's own bootstrap — one tenant, one
owner, child Organizations per outlet), not separate franchisee
relationships. There is no real franchise partner to model yet. Building
royalty/territory/compliance infrastructure now would be exactly the
"advanced workflow with no consumer" the lean-scope correction warns
against. Revisit if/when Colonel Kebabz actually franchises to a third
party — `approval` (compliance sign-off) and `evidence` (audit photos) are
still the right reuse call whenever that happens.

## Phase 3 status: lean-V1 core SHIPPED (2026-09-10), Franchise deferred

Phase 3's real, currently-needed scope (Attendance/Shifts/Payroll Inputs)
is done. Franchise is explicitly deferred pending a real franchise
relationship, not silently skipped.

## Phase 4 — Finance & Reconciliation

**SHIPPED (2026-09-10) — Expenses + Cash Reconciliation + lean Outlet
P&L** (§44-46, 48-49). New `finance` capability. Binary approve/reject on
`Expense`, not the `approval` capability's multi-step chain — same lean
posture as coupon/wastage/complaint compensation this session (`approval`
still reusable once a real threshold is decided). §46 (payment method
breakdown) needed zero new code — `dinein.salesSummary`'s own `byMethod`
already covered it, exactly as this section originally predicted.

`getOutletPnL` is an explicit ESTIMATE, documented as such in its own
result (`cogsIsApproximate: true` + a `note` field): COGS is valued at
ingredients' CURRENT average cost (not the cost at the moment each was
actually consumed — Issue movements don't carry a point-in-time unit cost),
and labour cost is NOT included at all — `attendance` supplies hours/days
worked, never a wage rate, so there is no real number to put on that line.
Matches PRD §49's own framing ("estimated... allow actual accounting
integration later").

- Delivery-platform reconciliation (§47) — still needs a real Zomato/Swiggy
  integration decision first (EXTERNAL dependency, credentials, API
  contracts). IMPLEMENTATION DECISION REQUIRED — flag to product owner
  before any code. Not built.

Tested: `src/test/capability-finance.test.ts` (expense approval, cash
reconciliation variance requiring an explanation, P&L math against a real
settled sale + approved expense).

## Phase 4 status: lean-V1 core SHIPPED (2026-09-10)

Expenses, Cash Reconciliation, Outlet P&L all built and tested. Delivery-
platform reconciliation remains blocked on a product-owner integration
decision.

## Phase 5 — Intelligence (deferred, matches PRD's own Phase 4)

Menu analytics (Star/Plow Horse/Puzzle/Dog), demand forecasting, AI business
assistant (§60–67, §102–104). Lowest priority; PRD itself places this last.

## Sequencing notes

- Phase 1's recipe/consumption gap is the load-bearing piece — every later
  food-cost, wastage-variance, and procurement-forecast feature depends on
  it existing first. It should be brainstormed before Phase 1's inventory/
  trading activation work, not after.
- **Do not start Phase 2 until Phase 1's order → recipe → consumption →
  inventory chain works end-to-end.** Later CRM/finance/intelligence layers
  depend on reliable operational data from that chain; building on top of
  it before it's proven risks compounding rework.
- Phase 2 (CRM) and Phase 3 (People/Franchise) don't depend on each other and
  could run in either order once Phase 1 lands.
- Phase 4 depends on Phase 1 (inventory cost) and Phase 3 (payroll inputs)
  for a complete Outlet P&L — partial P&L (revenue + known expenses only)
  is possible earlier if wanted sooner.
- UI outlet-switcher (Phase 0's carried-forward gap) is cheap and outlet
  managers will want it immediately — worth pulling into whichever phase
  starts next, regardless of topic.

## Explicitly not planned yet

Everything in this document is a *map*, not a commitment to build all of it.
Each phase above still needs its own brainstorming → design spec → plan
cycle before implementation, per the process already used for Phase 0.
