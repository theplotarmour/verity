# Task 77 — `verity.capability.billing` (future candidate)

Authority: `erpclaw-prd/05-verity-extraction-plan.md` §3.6 (ERPClaw source).
INV-001.

## Status: BUILT, MVP scope, 2026-09-04 — built ahead of this file's own
demand trigger under explicit product-owner override. See
`src/server/capabilities/billing/index.ts` for what shipped (meters,
readings, flat rate-per-unit period invoicing, double-billing blocked by a
DB constraint) and what didn't (rate tiers, time-of-use/demand pricing,
prepaid credit, a tracked batch-run entity — this file's own open scope).

No current client needs metered/recurring billing — Shree Ganesh Timber
Trade is order-by-order plywood trading, not subscription. Step-14 territory.

**Trigger to start:** a SaaS, utility, membership, or rental client appears.
Keep separate from one-off sales invoicing (Task 74) even then.

## Purpose

Recurring and usage-based billing.

## Scope

- Meters, meter readings, usage events.
- Rate plans and tiers, time-of-use pricing, demand pricing.
- Prepaid credit.
- Billing periods, billing runs, generated invoices, manual invoice links,
  adjustments, resume/retry for batch billing.

## Critical requirements (carried over)

- A billing period cannot be invoiced twice.
- Manual invoice linking prevents duplicate generation.
- A billing run records per-target progress; a failed target does not
  silently skip.
- Prepaid credit over-limit does not deduct.

## Verity fit (if built)

- Useful for SaaS, utilities, memberships, rentals, subscription clients.
- Separate capability from one-off sales invoicing (Task 74) — different
  lifecycle, different failure modes (batch resume vs. single-document
  reversal).

## Non-goals

- Not sales-order invoicing — see Task 74.
