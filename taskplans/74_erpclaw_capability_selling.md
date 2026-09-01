# Task 74 — `verity.capability.selling` (future client capability)

Authority: `erpclaw-prd/05-verity-extraction-plan.md` §3.3 (ERPClaw source).
INV-001, ADR-009 (StateCategory).

## Status: PENDING — not in current scope

**Trigger to start:** a second client needs customer-to-cash workflows.
Plywood already implements a specialized version (sales orders, invoices,
credit orders, ledger settlement — Tasks 49/71). A generic selling module
must not replace it; it can only be extracted after a second client's needs
are known well enough to design the shared shape without distorting either
client.

## Purpose

Reusable customer-to-cash workflows: quotations through invoices and
credit notes.

## Scope

- Customer master, sales partners where needed.
- Quotations, sales orders.
- Delivery notes/packing slips, sales invoices, credit notes.
- Credit limit / hold / suspend.
- Dunning levels and cycles.
- Recurring invoices when paired with billing (Task 77).

## Non-goals

- Not a replacement for plywood's `SalesDesk.tsx` / `trading.ts` — stays
  client-private.
- Not point-of-sale or e-commerce checkout — see Task 83 (retail family).

## Critical requirements

- Customer existence and balances are live reads, never cached/chat-memory
  assumptions (see Task 81, §5.1 live-record grounding).
- Commercial terms (price, discount, tax) snapshot onto orders/invoices at
  creation time — never re-derived later from a mutable price list.
- Invoice cancellation reverses effects; it does not delete the invoice
  (ADR-009 terminal-state discipline).
- Dunning skips incomplete contact/template data with a note, never a
  silent no-op.
- Credit availability is computed from current receivables, not a cached
  guess.

## Verity fit (if built)

- A future generic commerce module should learn from plywood and ERPClaw
  together, not copy either wholesale.

Extraction priority (per source doc): Medium-high, and only after accounting
(Task 72) and inventory (Task 73) contracts are settled.
