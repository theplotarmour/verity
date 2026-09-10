# Colonel Kebabz — Multi-Outlet Dine-In (Slice 1)

**Status:** Approved for implementation planning
**Date:** 2026-09-10
**Client:** Colonel Kebabz (`clients/colonel-kebabz/prd.md`, reference only — not a literal build spec)

## Context

Colonel Kebabz is onboarded as a Verity client organization: one Tenant, three
outlets (Defence Colony, R.K. Puram / Som Vihar, Gurugram). The full PRD
describes a large multi-module restaurant ERP (POS, CRM, procurement,
inventory, staff, finance, franchise). Per project CLAUDE.md, Verity is
building toward PLATFORM FOUNDATION READY and client work proceeds as
capability reuse/extension, not a bespoke fork — confirmed with the product
owner: Colonel Kebabz is built as a client *in* Verity, using the PRD only to
understand the client's needs, not as a literal spec to implement section by
section.

The `dinein` capability (`src/server/capabilities/dinein/index.ts`,
`verity.capability.dinein`) already implements a complete single-outlet
dine-in flow: central menu, floor/table management, order → kitchen → bill →
payment, GST computation, day sales summary. It was built for Kent's
Restaurant, Defence Colony, and is explicitly designed to be reusable by the
next table-service restaurant without a fork.

**Gap:** every operational entity in `dinein` (`DiningZone`, `DiningTable`,
`DiningOrder`, `Bill`) scopes only to `tenantId`. One tenant currently means
one outlet. Colonel Kebabz needs one tenant, three outlets, shared central
menu, outlet-local floor/orders/bills.

## Scope of this slice

**In scope:**
- Colonel Kebabz onboarded as a Tenant + Organization + 3 `Location` rows
  (Defence Colony, R.K. Puram, Gurugram) — minimal fields (name, code,
  address) only.
- `dinein` capability gains `locationId` scoping on `DiningZone`,
  `DiningTable`, `DiningOrder`, `Bill` — floor, orders, and bills become
  outlet-local.
- Menu (`MenuCategory`, `MenuItem`, `MenuItemVariant`) stays tenant-wide —
  one central menu shared by all three outlets, matching PRD §12
  ("centralized master data").
- Location-scoped authorization for outlet managers, using the platform's
  existing `Location` permission scope (`PLA-AUT-002`,
  `src/server/platform/authorization.ts:244` `reachableLocations`) — no new
  auth mechanism.
- End-to-end: seat a table at a specific outlet → take an order → send to
  kitchen → bill → pay → settle, for any of the 3 outlets, without floor or
  order data leaking across outlets.

**Explicitly out of scope for this slice** (deferred to later slices, per
PRD phase framing but not committed to a phase number yet):
- Per-outlet menu/price overrides (PRD §118).
- Everything else in the PRD: CRM, loyalty, procurement/vendors/PO/GRN,
  inventory/stock ledger, staff/attendance/payroll, franchise/royalty,
  finance/P&L, delivery-platform reconciliation, marketing, reviews,
  reporting beyond the existing day-sales-summary query, AI assistant.
- Outlet commercial/operational fields beyond name/code/address (rent,
  franchise fee, seating capacity, delivery radius, etc. — PRD §7).

## Architecture

Reuse `dinein` unmodified in shape — same commands, same event model, same
transition engine, same SLA clocks. The only structural change is adding a
scope column and threading it through.

```
Colonel Kebabz (Tenant)
  └── Organization (Colonel Kebabz)
        ├── Location: Defence Colony
        ├── Location: R.K. Puram
        └── Location: Gurugram

dinein capability (tenant-wide):
  MenuCategory / MenuItem / MenuItemVariant   — unchanged, no locationId

dinein capability (outlet-local, gains locationId):
  DiningZone → DiningTable → DiningOrder → OrderLine
                                 └── Bill → Payment
```

## Data model changes

Add `locationId` (`String @db.Uuid`, FK to `Location`, tenant-scoped
composite the same way `Organization`'s parent link is — `(tenantId,
locationId)` referencing `(tenantId, id)` on `Location`) to:

- `DiningZone`
- `DiningTable` (inherits zone's location; stored directly for query
  simplicity rather than joined every time)
- `DiningOrder` (inherits table's location at creation, stored directly)
- `Bill` (inherits order's location, stored directly)

`OrderLine` and `Payment` are not scoped directly — they're reached via
`orderId`/`billId` and inherit scope transitively, consistent with how the
existing code already treats them (no independent tenant-scope check on
`OrderLine` beyond its parent order).

`MenuCategory`, `MenuItem`, `MenuItemVariant` — **no changes**.

## Command/query changes

- `defineZone` — input gains required `locationId`; precondition validates
  the Location exists and belongs to this tenant.
- `defineTable` — `locationId` derived from its zone, not a separate input.
- `createOrder` — `locationId` derived from the table, stored on the order.
- `generateBill` — `locationId` derived from the order, stored on the bill.
- `moveTable`, `addOrderLines`, `placeOrder`, `advanceOrderLine`,
  `voidOrderLine`, `cancelOrder`, `applyBillDiscount`, `recordPayment`,
  `settleBill` — unchanged in signature; they resolve location internally
  from the entity row where needed for the authorization check below.
- `listMenu` — unchanged (tenant-wide).
- `listFloor`, `kitchenQueue`, `listOpenBills`, `salesSummary` — filter to
  `locationId` (new required or optional-defaulting-to-actor's-outlet input,
  decided during planning) instead of tenant-wide.

**Authorization:** every command/query that reads or writes a
location-scoped entity checks the actor's reachable locations via
`reachableLocations()` (already implemented, `PLA-AUT-004`) before or
alongside its existing precondition checks. This is additive to, not a
replacement for, tenant isolation (`INV-001`) — Location is a narrower scope
inside a tenant, not a new isolation boundary, and RLS is untouched.

## Error handling

- Acting on a `locationId` the actor cannot reach fails the same way an
  unauthorized command already fails elsewhere in the platform (through
  `enforcePolicy()` / the existing `ForbiddenError` path used in
  `capability-dinein.test.ts`) — no new error type.
- A `locationId` that doesn't exist, or belongs to a different tenant, is a
  `ValidationError` at the precondition stage, same style as existing
  "entity not found" checks in this file.

## Testing

- Extend `src/test/capability-dinein.test.ts` (or a sibling file) to cover
  two `Location`s under one tenant:
  - Floor/orders/bills created at Location A are invisible to
    `listFloor`/`kitchenQueue`/`listOpenBills` scoped to Location B.
  - Menu is visible and orderable identically at both locations.
  - An actor with a Location-scoped grant for only Location A cannot create
    a table/order/bill at Location B (`ForbiddenError`).
  - Full sale workflow (seat → order → kitchen → bill → pay → settle)
    succeeds independently and concurrently at both locations without
    cross-contamination.
- No changes needed to tenant-isolation tests (`tenancy.ts`,
  `assertRlsEnforceable`) — this slice does not touch RLS.

## Open questions for the implementation plan (not blocking design approval)

- Exact shape of the location-membership grant for an outlet manager: a new
  `RoleLocationGrant`-style table, or reuse of an existing scope-resolution
  table if one already backs `resolveScopeAxis(tx, actor, "Location")` —
  needs a read of `resolveScopeAxis`'s current implementation before
  planning, since `authorization.ts:158` notes Location resolution "belongs
  to whichever capability owns Location" and that capability
  (`src/server/capabilities/location/index.ts`) needs to be read in full.
- Whether `listFloor`/`kitchenQueue`/`listOpenBills`/`salesSummary` take an
  explicit `locationId` argument or default to "all locations the actor can
  reach" — affects the HQ-dashboard use case (PRD §5, outlet comparison)
  even though that dashboard itself is out of scope this slice.
