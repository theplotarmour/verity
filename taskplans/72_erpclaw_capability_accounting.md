# Task 72 — `verity.capability.accounting` (future client capability)

Authority: `erpclaw-prd/05-verity-extraction-plan.md` §3.1 (ERPClaw source).
Bible V2 Primitive 2 (Command/State/Event), ADR-005 (Tenant/Organization),
INV-001 (tenant isolation), INV-002 (read-only closed states).

## Status: BUILT, MVP scope, 2026-09-04 — built ahead of this file's own
demand trigger under explicit product-owner override. See
`src/server/capabilities/accounting/index.ts` for what shipped (chart of
accounts, append-only balanced GL, reversal-only correction) and what
didn't (fiscal-year close, budgets, dimensions, statement reports —
tracked below as this file's own open scope, not silently claimed done).

Verity's current objective is PLATFORM FOUNDATION READY (`CLAUDE.md` §Build
priority, steps 1–9: tenancy, identity, authorization, entity runtime,
command/query, state/transition, event/audit). This is a step-14
hypothetical-future-capability candidate, not active work. It is recorded
here so the extraction is not lost, and so a future capability build starts
from a requirements doc instead of a blank page.

**Trigger to start:** a concrete tenant needs real double-entry books beyond
what Shree Ganesh Timber Trade's plywood ledger already covers (party
balances, GST, order-linked payments). Plywood's finance automation
(Task 71) proves the pattern at client-private scale; do not generalize
until a second client needs the same shape.

## Purpose

Core finance foundation for tenants that need real books: chart of accounts,
fiscal periods, journal entries, GL, budgets, statements.

## Scope

- Company accounting profile.
- Chart of accounts.
- Fiscal years and period close.
- Journal entries and GL entries.
- Cost centers and accounting dimensions (registered metadata, never ad hoc
  columns — Spec PLA-EXT-001 custom-field pattern applies instead).
- Budgets.
- Trial balance, P&L, balance sheet, cash flow, general ledger report.
- Audit and integrity checks.

## Non-goals

- Not a replacement for plywood's existing `finance.ts` ledger — that stays
  client-private (Task 71) until a second client proves reuse.
- Not ASC 606/842, consolidation, or intercompany — see Task 80.
- Not payroll GL postings — see Task 79.

## Critical requirements (carried over from ERPClaw, reworded for Verity)

- Money stored as integer minor units or a decimal-safe type, never floats —
  matches the plywood convention already in `src/server/capabilities/plywood`.
- Submitted GL entries are immutable; corrections are reversal/amendment
  entries, never in-place edits (INV-002 pattern extended to GL rows).
- Every posting balances before commit.
- Period close blocks ordinary posting to closed/frozen periods.
- Dimensions are registered metadata, not ad hoc columns.
- Reports reconcile to GL rows; an untagged bucket surfaces missing
  dimensions rather than silently dropping them.

## Verity fit (if built)

- Capability-private tables under `src/server/capabilities/accounting/`.
- `EntityDefinition` rows for accounts, fiscal years, journal entries, GL
  entries, dimensions, budgets — following the registration pattern already
  used by shipped capabilities.
- Command runtime for posting, reversing, closing, reopening, importing —
  through the existing Command/State/Event vocabulary, never a bypass path.
- Query definitions for statements and drilldowns.
- Workspace contributions (`contribution.ts` pattern) for finance dashboard
  cards — the shell must not gain a capability-to-route map for this.

## Open decisions (do not resolve now)

- Whether accounting becomes a shared platform capability or stays
  client-private per tenant is itself a decision that needs a second real
  client and, per `CLAUDE.md` Authorization/Identity precedent, likely an
  ADR before code — classify as **missing ADR** if this is picked up before
  one exists.
