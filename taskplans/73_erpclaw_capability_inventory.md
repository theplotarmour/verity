# Task 73 — `verity.capability.inventory` (future client capability)

Authority: `erpclaw-prd/05-verity-extraction-plan.md` §3.2 (ERPClaw source).
ADR-004 (Place/Address/Location/Geofence), ADR-008 (Resource), INV-001.

## Status: PENDING — not in current scope

Same foundation-first constraint as Task 72. **Trigger to start:** a second
stock-heavy client appears after Shree Ganesh Timber Trade's plywood godown
system. Verity already has plywood-specific stock behavior
(`src/server/capabilities/plywood`, `GodownList.tsx`, rack withdrawal); do
not extract until reuse beats a second client-private implementation.

## Purpose

Reusable inventory foundation for trading, retail, distribution,
manufacturing, clinics, salons, hospitality.

## Scope

- Item master and item groups.
- Units of measure and conversions.
- Warehouses/godowns — could share the existing `Location` primitive
  (ADR-004) rather than inventing a parallel concept.
- Stock entries, stock balances, stock ledger movements.
- Stock reconciliation and revaluation.
- Reorder checks.
- Batch and serial tracking.
- Reservations, pick lists.
- Item alternatives, price lists and item prices.

## Non-goals

- Not a fork of plywood's godown/rack model — that stays client-private
  until a second client proves the generic shape.
- Not warehouse *management* (slotting, wave picking) — pick lists and
  reservations only.

## Critical requirements

- Direct stock ledger writes are never a user-facing workflow.
- Stock movements with accounting impact write quantity and value
  atomically (same transaction, same command).
- Purchased goods on an open purchase order are received only through the
  purchase flow; sold goods on an open sales order are issued only through
  delivery/fulfillment — no side-door stock adjustment for order-linked
  movement.
- Reservations cannot exceed available stock.
- Pick-list cancellation releases reservations.
- Revaluation/reconciliation leaves audit evidence (Event/Audit runtime,
  never a silent balance edit).

## Verity fit (if built)

- Could share the `Location` primitive for warehouses/godowns (ADR-004).
- Capability-private stock tables for item, stock balance, movement,
  reservation, pick list.
- Client systems such as plywood can consume this module or keep
  specialized private tables — this is explicitly a "governed" extraction,
  not a mandate to migrate plywood.

## Open decisions

- Whether plywood's godown/rack model migrates onto this module, or stays
  parallel forever, is an **implementation decision required** at the point
  a second client exists — not now.
