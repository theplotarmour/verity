# Task 87 — Import/export & migration framework

Authority: `erpclaw-prd/03-data-actions-and-controls.md` §9 (Import/Export
Requirements). User synthesis, 2026-09-03, item 9 — elevated priority,
adds the pipeline shape.

## Status: BUILT 2026-09-09, item/customer/supplier scope

Trigger fired: Shree Ganesh Timber Trading Co. is Verity's one real
client (confirmed 2026-09-09), and Phase 2's own gate ("the next tenant
onboarding for plywood that isn't a developer running the seed script")
already applies to it. Same trigger event that reopened Task 93.

**Shape delivered** — `Import → map → validate → preview → commit →
reconcile` exactly as scoped, at CSV-file scale, for the three entity
types named in Scope below (`item/customer/supplier import ... usable
against plywood today`):

- `src/server/capabilities/trading/import.ts` — `previewCustomerImport`/
  `previewSupplierImport`, validating each row against the SAME zod
  schema `createCustomer`/`createSupplier` already use (never a second
  definition of what makes a valid row).
- `src/server/capabilities/plywood/index.ts` — `previewProductImport` +
  `commitProductImport`, a two-pass commit (`ensureBrand` find-or-create,
  then `createProduct`) since a CSV names a brand by text, not a UUID.
  `ensureBrand` (`trading/index.ts`) is new: find-or-create, distinct
  from `createBrand`'s create-only/clash-rejecting semantics.
- `src/server/actions/import.ts` — the bridge (`runImportPreview`,
  `runImportCommit`), same discipline as `platform.ts`'s `runCommand`.
- `src/app/(shell)/import/` — the UI, one page, three kinds, CSV paste
  or file upload, per-row pass/fail reporting. Reuses `Panel`/`Field`/
  `Button` and the existing table pattern from `PriceSheet.tsx` — no new
  design system work.
- Partial-failure preserved throughout via `runCommandBatch` (Task 91):
  one bad row never fails the rest, at both the brand-resolution and the
  product-creation stage.

**"Map" is deliberately not a drag-and-drop column mapper** — a CSV
column matching a target field name (case-insensitively) is picked up
automatically. This taskplan's own non-goal ("not a generic ETL
platform") stays intact: three concrete entity kinds, not a fourth
generic path.

**What stays out of this scope, per the Scope section below (unchanged)**:
chart-of-accounts/opening-balance import (needs Task 72 settled — it is)
and bank-statement import/reconciliation (Task 88's own domain, still
correctly gated on its own trigger).

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
