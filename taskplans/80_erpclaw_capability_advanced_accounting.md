# Task 80 — `verity.capability.advanced-accounting` (future candidate)

Authority: `erpclaw-prd/05-verity-extraction-plan.md` §3.9 (ERPClaw source).

## Status: PENDING — not in current scope, lowest priority of the set

Extraction priority per source doc: **Low, until enterprise accounting
client demand appears.** Enterprise-grade, outside plywood/Shree-Ganesh-style
client needs.

**Trigger to start:** an enterprise client needs multi-entity consolidation,
lease accounting, or revenue-recognition beyond Task 72's basic GL. Do not
build ahead of demand.

## Purpose

Complex accounting for larger clients.

## Scope

- ASC 606 revenue contracts and performance obligations.
- ASC 842 lease accounting.
- Intercompany transactions, transfer pricing.
- Consolidation groups, currency translation, elimination entries.
- Compliance dashboard.

## Critical requirements (carried over)

- Eliminations happen at the consolidation layer, never inside an operating
  company's own books.
- Only posted intercompany transactions can be eliminated.
- Re-running eliminations is idempotent.
- Lease and revenue calculations preserve their assumptions (auditable, not
  recomputed silently on different inputs later).

## Dependency

Requires Task 72 (`verity.capability.accounting`) to exist first — this
extends a GL that doesn't exist yet.
