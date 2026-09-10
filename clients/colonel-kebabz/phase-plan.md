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
| `trading` | **only via `plywood`**, not standalone | Vendors, purchase/sales orders, GRN, invoices, payments, GST, stock ledger | Procurement (§21–27) — generic, godown-terminology not restaurant-terminology |
| `inventory` | yes | Item groups, items, Location-scoped stock balance, append-only movement ledger | Stock/ledger (§17–20) — already Location-scoped like `dinein` now is |
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

**Reuse, activate for Colonel Kebabz:**
- `inventory` — ingredients as items, Location-scoped stock balance and
  movement ledger. Covers §17–19 (Inventory, Stock Ledger, Stock Count).
- `trading` — needs to be **registered standalone** (currently reachable only
  through `registerPlywoodCapability()`); covers §21–26 (Purchase Requests,
  POs, GRN, Vendor Management, Price History). This is an
  IMPLEMENTATION DECISION REQUIRED item: confirm `trading` truly has no
  plywood-specific residue before activating it for a restaurant tenant —
  needs a read of what ADR-018's extraction actually left behind.

**New-build (real gaps, no existing capability covers these):**
- **Recipe-driven theoretical consumption** (§14–16: Recipe, BOM, Food Cost
  variance). `dinein.MenuItem` has no ingredient linkage today. This is the
  single most architecturally significant piece of Phase 1 — it's the
  `ORDER COMPLETED → Inventory Consumption` event chain the PRD's own §128
  names as the difference between an ERP and a dashboard. Needs its own
  design pass: does the recipe live in `dinein` (menu owns it) or a new
  capability that references both `dinein.MenuItem` and `inventory.Item`?
- **Wastage** (§20) as its own reason-coded record — `inventory`'s
  `Adjustment` movement type is the mechanism; wastage reason + `evidence`
  photo attachment is additive, not a fork.

## Phase 2 — CRM & Loyalty (new-build)

No existing capability covers guest CRM. `dinein.DiningOrder` deliberately
carries only `customerName`/`customerPhone` (ADR-001/ADR-007: a walk-in diner
is not a Party). Customer 360, segmentation, loyalty points, coupons,
campaigns, reviews, and complaints (§28–37) are all new. This needs its own
brainstorming pass before any code — in particular, whether a guest who
returns often ever becomes a Party (and if so, under what identity-resolution
rule, given ADR-007 already governs Party de-duplication).

`approval` is reusable for complaint-resolution / service-recovery sign-off
(§37) once the Complaint entity exists.

## Phase 3 — People & Franchise

**Reuse:** `hr` for employees, departments, leave (§38, §41) — activate as-is.

**New-build:**
- Attendance, shifts, payroll inputs (§39–40, §42) — explicitly out of
  `hr`'s stated scope per its own header comment. Smallest correct shape:
  a sibling capability, not an `hr` fork.
- Franchise partner, agreement, territory, royalty, compliance, audits
  (§50–53) — no existing capability. `approval` reusable for compliance
  sign-off chains; `evidence` reusable for audit photos; `billing`
  (meter/periodic invoicing of a Party) is worth evaluating against a
  purpose-built royalty calculator before committing either way.

## Phase 4 — Finance & Reconciliation

- Expenses (§44) — doesn't cleanly fit `trading` (vendor-order-shaped) or
  `billing` (meter-shaped). Likely its own small entity: category, outlet,
  amount, receipt (reuse `evidence`), approval (reuse `approval`).
- Cash reconciliation (§45), payment tracking (§46) — `dinein.Payment`
  already records method/amount per bill; this phase is a reporting layer
  over data that already exists, not new writes.
- Delivery-platform reconciliation (§47) — needs a real Zomato/Swiggy
  integration decision first (EXTERNAL dependency, credentials, API
  contracts). IMPLEMENTATION DECISION REQUIRED — flag to product owner
  before any code.
- Outlet P&L / Finance dashboard (§48–49) — reporting over Phase 1
  (inventory cost) + this phase (expenses) + `hr` (payroll inputs), so it
  necessarily comes after those, not before.

## Phase 5 — Intelligence (deferred, matches PRD's own Phase 4)

Menu analytics (Star/Plow Horse/Puzzle/Dog), demand forecasting, AI business
assistant (§60–67, §102–104). Lowest priority; PRD itself places this last.

## Sequencing notes

- Phase 1's recipe/consumption gap is the load-bearing piece — every later
  food-cost, wastage-variance, and procurement-forecast feature depends on
  it existing first. It should be brainstormed before Phase 1's inventory/
  trading activation work, not after.
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
