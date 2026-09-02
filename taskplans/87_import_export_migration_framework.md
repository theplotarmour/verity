# Task 87 — Import/export & migration framework

Authority: `erpclaw-prd/03-data-actions-and-controls.md` §9 (Import/Export
Requirements). User synthesis, 2026-09-03, item 9 — elevated priority,
adds the pipeline shape.

## Status: PENDING — genuinely new gap, real business-model relevance

## Why this one is worth taking seriously

User's own framing: Verity's actual clients arrive from Excel, Google
Sheets, Tally, a legacy ERP, or a WhatsApp/manual process. Migration into
Verity is part of the product, not a one-off consulting task solved by
hand each time.

## Shape

`Import → map → validate → preview → commit → reconcile`, mirroring Task
81 rule 8's six-step contract at the scale of a whole file rather than one
record — a bad row shouldn't fail the whole import (see Task 91, same
partial-failure principle). Export: CSV / Excel / PDF, per `erpclaw-prd`'s
list — Verity's existing print/PDF surfaces (if any) are the starting
point, not a new system.

## Scope

- Chart-of-accounts / opening-balance import (once Task 72 accounting
  exists), item/customer/supplier import (usable against plywood today).
- Bank-statement import + reconciliation ties to Task 88 (reconciliation
  as a first-class pattern) — likely the same underlying primitive.

## Trigger to start

The next client onboarding that isn't a from-scratch demo seed — i.e. real
data coming in from outside Verity for the first time.

## Non-goals

- Not a generic ETL platform — scoped to the entity types Verity's own
  capabilities already define.
