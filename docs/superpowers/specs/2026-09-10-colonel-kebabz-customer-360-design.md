# Colonel Kebabz — Customer/360 (Lean V1) Design

**Date:** 2026-09-10
**Status:** Approved
**Scope:** PRD §28-30 (Customer CRM, Customer 360, Segmentation), lean V1 only —
per explicit product-owner scope correction 2026-09-10 ("minimum modules
needed to actually use Verity", not the PRD's full depth. See phase-plan.md
and `feedback_lean_v1_scope` memory.). Loyalty/Coupons/Complaints/Service
Recovery are separate, later design cycles.

## Why a new capability, not Party

A walk-in diner is not a Party (ADR-001, ADR-007) — no login, no cross-tenant
identity, no de-duplication question. `Customer` is a new, tenant-scoped,
capability-private concept that exists purely to hang CRM data off a phone
number. This sidesteps ADR-007 entirely rather than extending it.

## Domain model

```
Customer
  id, tenantId, phone (unique per tenant), name, email?, birthday?,
  marketingConsent (bool, default false), preferredLocationId?,
  createdAt, updatedAt, version
```

Matched by `phone`, unique within a tenant, shared across outlets (a chain's
regular is one customer, not one per outlet they've visited).

Dropped from the PRD's full field list for V1 (cheap to add later, no
current consumer): `preferredChannel`, `anniversary`. Both are plain nullable
columns if/when campaigns or birthday-benefit automation need them.

## Derived, never stored

Total spend, order count, average order value, last order date — computed
at query time by joining `Bill`/`DiningOrder` on `customerPhone = phone`.
Never cached on `Customer`: a stored, incrementally-updated total is a
second source of truth that can drift from the ledger it's summarizing
(same reasoning `inventory`'s stock balance already follows).

Not built for V1: "favourite items" (real per-item aggregation across order
history — no current consumer asking for it).

## Segmentation

No stored segment table, no rules engine. `listCustomers` takes optional
filter params (`minSpendPaise`, `minVisits`, `daysSinceLastOrder`,
`locationId`) computed against the same derived aggregates above. The PRD's
named segments (VIP, Frequent, At Risk, Lapsed, New, High AOV, per-outlet)
are UI-level presets over these filters, not platform concepts — "segments
update automatically" is satisfied for free since nothing is cached.

## Creation

No `createCustomer` command. A customer record is upserted automatically
by `upsertCustomerForOrder(ctx, orderId)`, a plain function (same pattern as
`recipe.postConsumptionForOrder`) called from `dinein.generateBill`'s
handler when `DiningOrder.customerPhone` is set. No separate authorization
surface — same posture as the recipe consumption hook: one authorized
command (`generateBill`) has a natural side effect, not two separately
authorized ones.

## Queries

- `getCustomer360(customerId | phone)` — profile + derived numbers +
  recent order history.
- `listCustomers(filters?)` — segment-filterable list.

## Backfill

A one-time script groups existing `DiningOrder` rows (from Phase 0's live
Colonel Kebabz tenant) by `customerPhone` and creates one `Customer` per
distinct phone, so spend/visit history is accurate from day one rather than
starting at zero for guests who already visited.

## Testing

`src/test/capability-crm.test.ts`: order with a phone auto-creates a
Customer; a second order with the same phone updates derived aggregates,
not a duplicate row; `listCustomers` filters correctly; `getCustomer360`
returns the right numbers.

## Non-goals (this cycle)

Loyalty points, coupons, marketing campaigns, review aggregation, complaint
management, service recovery — each its own later design cycle, per the
lean-V1 scope correction.
