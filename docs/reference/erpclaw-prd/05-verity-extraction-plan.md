# 05 Verity Extraction Plan

## 1. Executive Position

ERPClaw is useful to Verity, but the right extraction is architectural and product-pattern driven, not a direct code transplant. ERPClaw is a Python/local-first/accounting-command system. Verity is a Next.js/Prisma/Supabase/RLS client-system platform with explicit capability registration, tenant isolation, command/query boundaries, semantic UI tokens, and authority documentation.

The extraction strategy should therefore be:

- Extract **module boundaries** where ERPClaw has clear ERP domain separation.
- Extract **AI-native operating rules** where ERPClaw has mature safety, grounding, and business-language behavior.
- Extract **metadata-driven dashboard/page patterns** from `UI.yaml`.
- Extract **financial/inventory invariants** as Verity capability requirements.
- Extract **agent development guidance** into a Claude Code / Codex skill for building Verity client capabilities.
- Do **not** copy ERPClaw implementation code into Verity without a separate compatibility review.

## 2. Extraction Classes

| Class | Extract? | Why |
|---|---|---|
| Product domain map | Yes | ERPClaw separates ERP into accounting, sales, buying, inventory, payments, billing, HR, payroll, advanced accounting, reporting, and vertical modules. |
| Entity/page metadata | Yes | `UI.yaml` is a strong source for dashboard sections, domain navigation, list/detail/form patterns, and quick actions. |
| AI command posture | Yes | Live lookup before claims, exact company matching, business-language summaries, and destructive confirmation gates are directly valuable to Verity. |
| Accounting invariants | Yes | Immutable GL, balanced postings, reversal over mutation, decimal money, period close, and audit are reusable requirements. |
| Inventory invariants | Yes | Order-backed receipt/issue, valuation tied to books, reservations, pick lists, batch/serial tracking, and revaluation are reusable requirements. |
| Optional module registry | Yes, conceptually | Verity can use a capability marketplace/activation model with dependencies and provenance. |
| Python command code | Usually no | Runtime, DB abstraction, auth, and UI stack differ from Verity. Reimplementation is safer. |
| ERPClaw table names | Partially | Useful as source vocabulary, but Verity should use its own capability/entity naming convention. |
| OpenClaw/Hermes runtime specifics | No, except lessons | Verity should not inherit another runtime's install/skill mechanics. |

## 3. Candidate Verity Client Capabilities

### 3.1 `verity.capability.accounting`

Purpose: core finance foundation for tenants that need real books.

ERPClaw source domains:

- General Ledger.
- Journal Entries.
- Fiscal Periods.
- Budgeting.
- Financial Reports.
- Advanced Accounting where needed.

Verity module scope:

- Company accounting profile.
- Chart of accounts.
- Fiscal years and period close.
- Journal entries.
- GL entries.
- Cost centers and accounting dimensions.
- Budgets.
- Trial balance.
- P&L.
- Balance sheet.
- Cash flow.
- General ledger report.
- Audit and integrity checks.

Critical requirements:

- Store money as integer minor units or decimal-safe values, never floats.
- Submitted GL entries are immutable.
- Corrections use reversal/amendment entries.
- Every posting balances before commit.
- Period close blocks ordinary posting to closed/frozen periods.
- Dimensions are registered metadata, not ad hoc columns.
- Reports reconcile to GL rows and show an untagged bucket for missing dimensions.

Verity fit:

- Capability-private tables.
- `EntityDefinition` rows for accounts, fiscal years, journal entries, GL entries, dimensions, budgets.
- Command runtime for posting, reversing, closing, reopening, importing.
- Query definitions for statements and drilldowns.
- Workspace contributions for finance dashboard cards.

Extraction priority: **High**. Plywood already needs ledger/accounting clarity, and future ERP-like client systems will need the same substrate.

### 3.2 `verity.capability.inventory`

Purpose: reusable inventory foundation for trading, retail, distribution, manufacturing, clinics, salons, and hospitality.

ERPClaw source domains:

- Inventory.
- Warehousing.
- Tracking.
- Pricing.
- Receiving/fulfillment touchpoints.

Verity module scope:

- Item master and item groups.
- Units of measure and conversions.
- Warehouses/godowns/locations.
- Stock entries.
- Stock balances.
- Stock ledger movements.
- Stock reconciliation.
- Stock revaluation.
- Reorder checks.
- Batch and serial tracking.
- Reservations.
- Pick lists.
- Item alternatives.
- Price lists and item prices.

Critical requirements:

- Direct stock ledger writes are not a user-facing workflow.
- Stock movements that have accounting impact must write quantity and value atomically.
- Purchased goods on an open purchase order must be received through the purchase flow.
- Sold goods on an open sales order must be issued through the delivery/fulfillment flow.
- Reservations cannot exceed available stock.
- Pick-list cancellation releases reservations.
- Revaluation/reconciliation leaves audit evidence.

Verity fit:

- Could share `Location` primitive for warehouses/godowns.
- Capability-private stock tables for item, stock balance, movement, reservation, pick list.
- Client systems such as plywood can either consume this module or keep specialized private tables until a second client proves reuse.

Extraction priority: **High**, but should be governed carefully. Verity already has plywood-specific stock behavior; extraction should occur only when reuse beats client-private implementation.

### 3.3 `verity.capability.selling`

Purpose: reusable customer-to-cash workflows.

ERPClaw source domains:

- Customers.
- Quotations.
- Sales orders.
- Delivery notes.
- Sales invoices.
- Credit notes.
- Dunning.

Verity module scope:

- Customer master.
- Sales partners where needed.
- Quotations.
- Sales orders.
- Delivery notes/packing slips.
- Sales invoices.
- Credit notes.
- Credit limit / hold / suspend.
- Dunning levels and cycles.
- Recurring invoices when paired with billing.

Critical requirements:

- Customer existence and balances are live reads.
- Commercial terms snapshot onto orders/invoices.
- Invoice cancellation reverses effects.
- Dunning skips incomplete contact/template data with notes.
- Credit availability is computed from current receivables, not cached guesses.

Verity fit:

- Plywood has already implemented a specialized version of this. General selling should not replace plywood until a deliberate extraction refactor is planned.
- A future generic commerce module can learn from plywood and ERPClaw together.

Extraction priority: **Medium-high**. Valuable, but only after accounting and inventory contracts are settled.

### 3.4 `verity.capability.buying`

Purpose: reusable procure-to-pay workflows.

ERPClaw source domains:

- Suppliers.
- Material requests.
- RFQs.
- Supplier quotations.
- Purchase orders.
- Purchase receipts.
- Purchase invoices.
- Debit notes.
- Landed costs.
- Three-way match.

Verity module scope:

- Supplier master.
- Material requests.
- RFQs and supplier quote comparison.
- Purchase orders.
- Purchase receipts / goods received notes.
- Supplier invoices.
- Debit notes.
- Landed cost allocation.
- Receipt tolerance.
- Three-way match policies.
- Recurring supplier bills.

Critical requirements:

- Purchase receipt updates quantity and valuation.
- Supplier invoice updates payables.
- Landed cost updates both GL and inventory valuation.
- PO creation from material requests supports partial ordering.
- Cancelling receipt/invoice reverses rather than deletes.

Verity fit:

- Strong match for plywood purchase lifecycle.
- Should remain client-private in plywood until a second client proves generic reuse.

Extraction priority: **Medium-high**.

### 3.5 `verity.capability.payments`

Purpose: reusable receivable/payable payment handling.

ERPClaw source domains:

- Payments.
- Payment ledger.
- Payment allocations.
- Deductions.
- Advances.
- Bank reconciliation.

Verity module scope:

- Customer receipts.
- Supplier payments.
- Allocations to invoices.
- Advances.
- Short-pay deductions.
- Write-offs.
- Bank reconciliation.
- Party ledger.
- Outstanding reports.

Critical requirements:

- Payment plus deduction can clear an invoice in one transaction.
- Advances stay visible until allocated.
- Cancelling a payment reverses allocations.
- No-cash write-off is distinct from a payment.
- Party ledger summary and invoice outstanding reconcile.

Verity fit:

- Plywood has party payments and balance settlement. A generic payments module should be extracted only after accounting semantics are fixed.

Extraction priority: **High** for requirements, **medium** for implementation timing.

### 3.6 `verity.capability.billing`

Purpose: recurring and usage-based billing.

ERPClaw source domains:

- Billing & Metering.
- Recurring invoices.
- Rate plans.

Verity module scope:

- Meters.
- Meter readings.
- Usage events.
- Rate plans and tiers.
- Time-of-use pricing.
- Demand pricing.
- Prepaid credit.
- Billing periods.
- Billing runs.
- Generated invoices.
- Manual invoice links.
- Adjustments.
- Resume/retry for batch billing.

Critical requirements:

- Billing periods cannot be invoiced twice.
- Manual invoice linking prevents duplicate generation.
- Billing run records per-target progress.
- Failed target does not silently skip.
- Prepaid credit over-limit does not deduct.

Verity fit:

- Useful for SaaS, utilities, memberships, rentals, and subscription clients.
- Should be separate from one-off sales invoicing.

Extraction priority: **Medium**.

### 3.7 `verity.capability.hr`

Purpose: people operations before payroll.

ERPClaw source domains:

- HR.

Verity module scope:

- Employees.
- Departments.
- Designations.
- Employee lifecycle events.
- Documents.
- Leave types and allocations.
- Leave applications.
- Attendance.
- Holiday lists.
- Shift types and assignments.
- Regularization.
- Expense claims.

Critical requirements:

- Sensitive employee data redacted.
- Leave and expense approvals preserve history.
- Attendance corrections are traceable.
- Documents have expiry checks.

Verity fit:

- Useful across many client systems, but not needed by every small tenant.

Extraction priority: **Medium**.

### 3.8 `verity.capability.payroll`

Purpose: payroll calculation and statutory outputs.

ERPClaw source domains:

- Payroll.

Verity module scope:

- Salary components.
- Salary structures.
- Salary assignments.
- Tax slabs and employee state config.
- FICA/FUTA/SUTA equivalents if US-focused.
- Overtime policies.
- Retro pay.
- Payroll runs.
- Salary slips.
- W-2 data.
- Bank-payment file generation.
- Garnishments.
- Amendment history.

Critical requirements:

- Payroll runs are stateful and reversible by cancellation.
- Retro pay calculation is idempotent.
- Bank-file generation is high-impact and confirmation-gated.
- Sensitive employee tax/bank data is encrypted/redacted.

Verity fit:

- Valuable but jurisdiction-heavy. For Indian client systems, payroll requirements must be rewritten around Indian statutory rules before implementation.

Extraction priority: **Low-medium** until a concrete client requires it.

### 3.9 `verity.capability.advanced-accounting`

Purpose: complex accounting for larger clients.

ERPClaw source domains:

- Advanced Accounting.

Verity module scope:

- ASC 606 revenue contracts and performance obligations.
- ASC 842 lease accounting.
- Intercompany transactions.
- Transfer pricing.
- Consolidation groups.
- Currency translation.
- Elimination entries.
- Compliance dashboard.

Critical requirements:

- Eliminations happen at consolidation layer, not inside operating company books.
- Only posted intercompany transactions can be eliminated.
- Re-running eliminations is idempotent.
- Lease and revenue calculations preserve assumptions.

Verity fit:

- Enterprise-grade but outside immediate plywood/Kent's style client needs.

Extraction priority: **Low** until enterprise accounting client demand appears.

## 4. Vertical Client Modules From ERPClaw Registry

ERPClaw's optional modules can inspire Verity client capability specs. They should not be marked built until implemented in Verity.

| ERPClaw module family | Verity candidate | Notes |
|---|---|---|
| HealthClaw | `verity.capability.clinic` / healthcare client systems | Verity already has `clinic.md`; ERPClaw can enrich billing, provider, insurance, lab, pharmacy, and compliance sections. |
| EduClaw | `verity.capability.coaching` / school / institute | Verity already has `coaching.md`; ERPClaw can enrich fees, attendance, grading, communications, LMS boundaries. |
| HospitalityClaw | `verity.capability.hospitality` / hotel | Strong future client module for rooms, reservations, front desk, housekeeping, F&B, revenue management. |
| LegalClaw | `verity.capability.legal` | Matters, time billing, trust accounting, conflicts, documents, court dates. |
| RetailClaw | `verity.capability.retail` | Stores, products, pricing, promotions, loyalty, POS integration, ecommerce. |
| PropertyClaw | `verity.capability.property` | Properties, units, leases, tenants, maintenance, rent accounting. |
| ConstructClaw | `verity.capability.construction` | Projects, contracts, budgets, RFIs, submittals, change orders, safety. |
| NonprofitClaw | `verity.capability.nonprofit` | Donors, campaigns, grants, volunteers, events, fund accounting. |
| AgricultureClaw | `verity.capability.agriculture` | Farms, fields, crops, livestock, equipment, harvest. |
| AutomotiveClaw | `verity.capability.automotive` | Vehicle inventory, service orders, parts, warranty, dealership workflows. |

## 5. AI Architecture To Extract

### 5.1 Live-record grounding

ERPClaw requires live database reads before claiming that a company, customer, item, balance, duplicate, or count exists. Verity should adopt this as a platform-level assistant rule for operational workflows.

Verity requirement:

- Before the assistant says a tenant has a record, balance, order, invoice, stock quantity, payment, or duplicate, it must query the relevant Verity read model in the current turn.
- Workspace context and prior chat memory are not authoritative for business records.

### 5.2 Exact legal entity resolution

ERPClaw refuses to guess company names. Verity should copy this for tenant/client/legal-entity resolution.

Verity requirement:

- If an action posts into a tenant, organization, business profile, company, or client legal entity, exact resolution is required.
- If not found, show available exact names and ask the user to choose.
- Do not autocorrect, fuzzy-match, abbreviate, or pick "closest".

### 5.3 Business-language command layer

ERPClaw hides action names from users. Verity should do the same for command keys.

Verity requirement:

- User-facing text says "send invoice", "record payment", "receive goods", "close period", "add customer".
- Internal keys such as `verity.plywood.create_sales_order` remain logs/dev references, not UI copy.
- Confirmation dialogs describe consequences, not implementation commands.

### 5.4 Confirmation classes

ERPClaw distinguishes routine reversible actions from destructive/high-impact actions.

Verity requirement:

- Routine user-requested actions can execute without re-asking if the user clearly authorized them.
- Destructive/high-impact actions require a second explicit confirmation.
- Examples: deleting/restoring data, closing fiscal periods, changing credentials, irreversible exports, schema/module operations, permanent cleanup, and external submissions.

### 5.5 Reversal over mutation

ERPClaw treats submitted financial records as immutable. Verity should apply this not only to finance but to operational ledgers.

Verity requirement:

- Submitted invoices, payment allocations, stock movements, GL entries, goods receipts/issues, audit events, and evidence attachments are corrected through reversals/addenda/adjustments.
- Draft records may be edited within defined lifecycle boundaries.

### 5.6 Metadata-driven UI

ERPClaw's `UI.yaml` demonstrates a domain/entity/action metadata model.

Verity requirement:

- Client modules should declare pages, entities, fields, forms, tables, actions, reports, status labels, permissions, and dashboard contributions as metadata where practical.
- Bespoke screens are still allowed for domain-critical workflows, but list/detail/form/report scaffolding should be generated or convention-driven.

### 5.7 Assistant plus dashboard

ERPClaw positions the assistant as primary and dashboard as optional. Verity can use the same split.

Verity requirement:

- Assistant is the fastest path for record creation, lookup, summaries, and chained workflows.
- Dashboard is the audit/review/control surface.
- Every assistant action should have a visible record trail in the dashboard.

## 6. Claude Code / Codex Skill To Create

### 6.1 Skill name

`verity-client-capability-builder`

### 6.2 Skill purpose

Guide Claude Code, Codex, or any repo agent to build Verity client capabilities using the project authority model, current implementation patterns, ERPClaw extraction lessons, and Verity security constraints.

### 6.3 Trigger examples

Use this skill when the user says:

- "Build a new Verity client module."
- "Extract this client requirement into Verity."
- "Implement a plywood-like module."
- "Add ERP/accounting/inventory/sales/buying/payments capability."
- "Turn this PRD into Verity capability code."
- "Use ERPClaw architecture for Verity."
- "Audit whether this should be platform or client capability."

### 6.4 Required context-loading order

The skill should instruct the agent to read:

1. Root `README.md` for current authority order.
2. `AGENTS.md` for local project rules and design-system constraints.
3. `implementation/PLATFORM-FREEZE.md` for allowed platform changes.
4. Relevant `verity-spec/` authority docs for platform/capability/entity/state/permission/data rules.
5. Existing shipped capability closest to the task, usually `src/server/capabilities/plywood`, `dinein`, `location`, `asset`, `evidence`, `scheduling`, or `approval`.
6. Relevant client design docs such as `plywood.md`, `KentsRestaurant.md`, `clinic.md`, `salon.md`, `coaching.md`, or this `erpclaw-prd`.

### 6.5 Skill rules

- Treat Verity's database and code as authority for current behavior.
- Distinguish current, partial, planned, demonstrated, target, and built/proven behavior.
- Keep client modules capability-private unless at least two real clients prove reuse.
- Do not broaden platform core to satisfy one client.
- Preserve RLS and fail-closed security guards.
- Use `withTenant()` and existing tenant-scoped patterns.
- Register capability definitions, entity definitions, commands, queries, workspace contributions, and migrations through established patterns.
- Use integer minor units for money in Indian client modules unless a stronger decimal contract is already established.
- Snapshot product names, HSN/tax codes, prices, discounts, tax rates, customer/supplier names, and commercial terms on submitted documents.
- Use append-only ledgers for stock/accounting/payment history.
- Use lifecycle states instead of deleting historical business records.
- Use reversals, addenda, allocations, and adjustment entries instead of editing submitted facts.
- Hide internal command keys from user-facing UI.
- Use semantic design tokens; do not hardcode dark text classes that fail in dark mode.
- Keep dense operational tables scrollable and legible.
- Add tests before claiming built/proven.

### 6.6 Skill output checklist

For every new capability, the agent should produce:

- Capability status statement.
- Requirement-to-platform primitive map.
- Scope boundaries and non-goals.
- Domain model.
- State machines.
- Commands.
- Queries.
- Permissions.
- Dashboard contributions.
- UI routes and page sections.
- Migration plan.
- Seed/demo plan.
- Test plan.
- Acceptance checklist.
- Open decisions.
- Implementation summary with exact files changed.

### 6.7 Skill anti-patterns

- "Navigation hiding is authorization."
- "One client's need means platform primitive."
- "JSON blob instead of a table for queryable line items."
- "Direct ledger row writes from UI."
- "Updating submitted financial facts in place."
- "Assuming a customer/supplier/item exists from chat memory."
- "Using action keys as visible product copy."
- "Adding a fake generic pack name before a real pack exists."
- "Calling docs complete because the worktree is clean."
- "Weakening RLS or bypass guards to make tests pass."

## 7. Proposed Skill File Draft

If saved as a local Codex/Claude skill, the initial `SKILL.md` can be:

```markdown
---
name: verity-client-capability-builder
description: Build or audit Verity client capabilities using Verity authority docs, shipped capability patterns, and ERPClaw-derived AI-native ERP rules.
---

# Verity Client Capability Builder

Use this skill when implementing, auditing, or documenting a Verity client capability.

## Context Order

1. Read root README.md for authority.
2. Read AGENTS.md.
3. Read implementation/PLATFORM-FREEZE.md.
4. Read relevant verity-spec authority docs.
5. Read the nearest shipped capability under src/server/capabilities.
6. Read relevant client docs and erpclaw-prd extraction notes.

## Rules

- Keep client capability code private unless reuse is proven by multiple real clients.
- Do not weaken RLS, tenant guards, or fail-closed behavior.
- Use existing command/query/state/permission/capability registry patterns.
- Store money safely; use integer minor units for Indian client modules.
- Snapshot commercial terms on submitted documents.
- Use append-only ledgers and reversals for financial/stock history.
- Hide internal command keys from user-facing copy.
- Query live records before claiming existence, balances, duplicates, or counts.
- Separate current, partial, planned, demonstrated, target, built, and proven behavior in docs.
- Add focused tests before claiming readiness.

## Deliverables

Produce capability status, scope, primitive map, domain model, state machines, commands, queries, permissions, routes, dashboard contributions, migrations, tests, acceptance checks, open decisions, and exact file summary.
```

## 8. Recommended Verity Roadmap

### Phase 1: Documentation extraction

- Keep `erpclaw-prd` as product source material.
- Add module candidate docs under `implementation/` only when a Verity build is planned.
- Reconcile `plywood.md` with ERPClaw accounting/inventory/payment patterns where it is already implemented.

### Phase 2: Skill installation

- Create the `verity-client-capability-builder` skill in the local Codex/Claude skill folder.
- Include this extraction plan as a reference.
- Add examples for plywood-style trading, dine-in restaurant, clinic, and generic accounting.

### Phase 3: First reusable module decision

Choose one extraction candidate:

1. Accounting, if the next client requires real books across modules.
2. Inventory, if another stock-heavy client appears after plywood.
3. Payments, if multiple client modules need allocations/advances/write-offs.

Do not start with advanced accounting or payroll unless there is a concrete client.

### Phase 4: Metadata compiler experiment

Build a small translator from ERPClaw-like metadata to Verity docs first:

- Domain list.
- Entity list.
- Field list.
- Actions.
- Dashboard contributions.
- Report definitions.

Only after docs stabilize should this become route/component generation.

## 9. Immediate Recommendations

- Treat ERPClaw as a reference architecture for ERP-grade invariants and AI operating rules.
- Use plywood and dine-in as the Verity proof that capability-private client systems work.
- Extract generic accounting/inventory/payments only after a second client proves the need.
- Create the Verity capability-builder skill before the next large client-module implementation.
- Keep the PRD explicit that ERPClaw source modules are inspirations, not Verity implementation claims.
