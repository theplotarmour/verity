# Task 76 — `verity.capability.payments` (future candidate)

Authority: `erpclaw-prd/05-verity-extraction-plan.md` §3.5 (ERPClaw source).
INV-001, INV-002.

## Status: PENDING — not in current scope

Plywood already has party payments and balance settlement
(`src/app/(shell)/ledgers/LedgerView.tsx`,
`src/server/capabilities/plywood/finance.ts`). Step-14 territory.

**Trigger to start:** extraction priority is High for the *requirements*,
Medium for *implementation timing* — capture the rules now, build only after
accounting semantics (Task 72) are fixed and a second client needs the same
allocation/advance/write-off shape.

## Purpose

Reusable receivable/payable payment handling: allocation, advances,
deductions, write-offs, bank reconciliation.

## Scope

- Customer receipts, supplier payments.
- Allocations to invoices, advances, short-pay deductions, write-offs.
- Bank reconciliation.
- Party ledger, outstanding reports.

## Critical requirements (carried over)

- Payment plus deduction can clear an invoice in one transaction.
- Advances stay visible until allocated — never folded silently into a net
  balance.
- Cancelling a payment reverses its allocations.
- A no-cash write-off is distinct from a payment (different command, not a
  zero-amount payment).
- Party ledger summary and invoice outstanding reconcile exactly.

## Verity fit (if built)

- Plywood's ledger/settlement behavior is the reference; a generic payments
  module is extracted only after accounting semantics are fixed elsewhere
  (Task 72), not standalone.

## Non-goals

- Not a plywood ledger replacement.
- Not GL posting rules themselves — see Task 72.
