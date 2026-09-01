# Task 75 — `verity.capability.buying` (future client capability)

Authority: `erpclaw-prd/05-verity-extraction-plan.md` §3.4 (ERPClaw source).
INV-001, ADR-009 (StateCategory).

## Status: PENDING — not in current scope

**Trigger to start:** a second client needs procure-to-pay workflows beyond
plywood's purchase chain (Task 48, 71). Strong match for plywood's existing
purchase lifecycle — stays client-private until a second client proves
generic reuse.

## Purpose

Reusable procure-to-pay workflows: material request through supplier
invoice and landed cost.

## Scope

- Supplier master.
- Material requests, RFQs, supplier quote comparison.
- Purchase orders, purchase receipts / goods received notes.
- Supplier invoices, debit notes.
- Landed cost allocation, receipt tolerance, three-way match policies.
- Recurring supplier bills.

## Non-goals

- Not a replacement for plywood's purchase flow (`PurchaseDesk.tsx`,
  `NewPurchaseOrderForm.tsx`, `trading.ts` receiving logic) — stays
  client-private.

## Critical requirements

- Purchase receipt updates quantity and valuation together.
- Supplier invoice updates payables — matches plywood's Task 71 decision
  that the money side is created at goods receipt, not order creation.
- Landed cost updates both GL and inventory valuation.
- PO creation from material requests supports partial ordering.
- Cancelling a receipt/invoice reverses rather than deletes (INV-002-style
  discipline extended to purchase documents).

## Verity fit (if built)

Extraction priority (per source doc): Medium-high — after plywood's own
purchase-chain shape has stabilized enough to generalize from without
distorting it.
