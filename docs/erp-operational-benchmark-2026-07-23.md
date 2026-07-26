# Verity ERP Operational Benchmark

Date: 2026-07-23  
Branch: updates  
Purpose: compare the current Verity implementation against real-world factory ERP expectations, including Odoo-class manufacturing ERP coverage.

## Verdict

Verity is a strong factory-floor operating core, not yet a complete real-world ERP.

It currently covers a meaningful manufacturing spine: orders, production plans, work orders, job cards, departments, QC templates, inspections, evidence, inventory ledger, bin balances, purchases, suppliers, dispatch, users, and reports. Static verification on 2026-07-23 passed TypeScript and ESLint reported warnings only.

But compared with Odoo-style ERP deployments in manufacturing factories, Verity is still missing several operational systems required before calling it fully functional in the real world: CRM depth, quotations, finance/accounting, receivables/payables, costing, robust analytics, workforce/payroll, barcode-heavy warehouse execution, implementation tooling, test coverage, and production support processes.

## Current Repository Evidence

Implemented surfaces found in the repo:

- Owner modules: dashboard, production, inventory, purchase, QC floor, logistics, floor, reports, settings, departments, team, users, search, system.
- Worker and inspector portals exist.
- Prisma models include Factory, User, Department, ItemMaster, Warehouse hierarchy, StockLedgerEntry, BinBalance, MaterialReservation, Supplier, PurchaseOrder, PurchaseReceipt, ProductionPlan, WorkOrder, JobCard, Customer, Deal, SalesOrder, SalesInvoice, PaymentReceipt, AttendanceLog, QCTemplate, Inspection, Dispatch, DispatchLog.
- Server actions exist for auth, users, production, orders, inventory, purchase, QC, inspector, worker, dispatch, reports, settings/master data, departments, permissions, storage, and timeline.
- Maintenance endpoints are token-gated in current code: seed-owner and reseed-catalog use `requireMaintenanceToken`; delete-productions checks `MAINTENANCE_TOKEN` directly.

Verification run:

- `npm run typecheck`: pass.
- `npm run lint`: pass with 11 warnings for unused eslint-disable directives.

## Benchmark Against Odoo-Class ERP

Odoo manufacturing deployments usually combine these modules into one operating system:

- CRM and sales pipeline.
- Quotations and sales orders.
- Inventory and barcode operations.
- Purchase and vendor management.
- Manufacturing orders, work orders, routings, BOMs, work centers, capacity, and scheduling.
- Quality checks, quality alerts, traceability, lots/serials.
- Accounting, invoicing, receivables, payables, tax, payments, credit notes.
- Employees, attendance, time off, payroll or payroll integrations.
- Dashboards, reporting, exports, audit logs.
- Implementation tooling: imports, migration, training, roles, backups, support, and test/staging rollout.

Verity has stronger domain-specific QC/passport/factory-floor UX than a generic ERP starter, but it does not yet match the breadth, controls, and implementation maturity of Odoo in a real factory deployment.

## Gap Matrix

| Area | Current Verity State | Odoo-Class Expectation | Priority |
|---|---|---|---|
| Manufacturing execution | Strong core with ProductionPlan, WorkOrder, JobCard, departments, QC, worker portal | Routings, work centers, scheduling, capacity, downtime, costing, rework analytics | P0/P1 |
| Inventory | Ledger, bin balances, warehouses, reservations, receipts, issues, adjustments | Barcode scanning, lots/batches, FEFO/FIFO, putaway, cycle counts, landed cost, valuation layers | P0/P1 |
| Procurement | Suppliers, POs, receipts, returns | RFQs, approvals, vendor price lists, lead times, bills, payment status, vendor scorecards | P1 |
| Sales/CRM | Customer and Deal models exist, but CRM is thin | Leads, activities, quotations, revisions, price lists, customer 360, sales targets | P0 |
| Finance | SalesInvoice, PaymentReceipt, PurchaseInvoice models exist, little/no operational UI | GST invoices, receivables aging, payables, credit notes, payments, tax reports, accounting exports | P0 |
| Quality | QC templates, inspections, evidence, rework, public verification | Quality alerts, NCR/CAPA, lot-level holds, supplier quality, defect Pareto | P1 |
| Dispatch/logistics | Dispatch exists | Packing validation, labels, courier/tracking, proof of delivery, customer/dealer notifications | P1 |
| Workforce | Employee/shift/attendance models exist; operational loop appears incomplete | Attendance, leave, shift planning, productivity, payroll/piece-rate | P1/P2 |
| Analytics | Dashboard/reports exist | Throughput, WIP aging, bottlenecks, OEE-lite, margin, sales, inventory turns, worker productivity | P1 |
| Permissions/admin | Role checks exist; docs previously flagged hardcoded matrix | Admin-editable module permissions, approval rules, audit review | P0/P1 |
| Offline/PWA | PWA shell exists | Offline queue for floor capture, conflict handling, sync monitoring | P1 |
| Implementation maturity | Build/typecheck/lint pass | Automated regression tests, seed/import tools, migration runbooks, staging/prod rollout, support SOPs | P0 |

## What Must Be Built First

### P0: Make It Deployable For A Real Factory

1. Add automated end-to-end smoke tests for the factory-critical path:
   lead or customer -> quotation/order -> production plan -> work order/job cards -> material issue -> stage completion -> QC -> finished goods receipt -> dispatch -> invoice/payment.
2. Build real CRM and quotation flow:
   leads, follow-ups, quotations, quote revisions, quote acceptance, customer 360, and conversion to order.
3. Build finance/accounting-lite:
   GST invoice generation, payment receipts, receivables aging, purchase invoices, payables, credit notes, and exportable accounting data.
4. Harden permissions:
   admin-editable permission matrix, approval rules, destructive action audit trail, and production-safe maintenance endpoint policy.
5. Finish inventory traceability:
   item labels, batch/lot UI, issue-by-batch, QC hold/rejected stock, cycle counts, and barcode-first warehouse actions.

### P1: Make It Operationally Competitive

1. Add manufacturing planning depth:
   capacity per department/work center, promised dates, WIP aging, bottleneck alerts, downtime/reason capture.
2. Add quality management beyond inspection:
   defect library, NCR/CAPA, supplier quality, defect Pareto, repeat-failure detection.
3. Add dispatch and customer/dealer communication:
   packing proof, courier partner, tracking numbers, proof of delivery, WhatsApp/email templates.
4. Add analytics:
   production throughput, cycle time, worker output, inventory turns, material variance, sales, margin, on-time delivery.
5. Complete workforce:
   attendance UI, shifts, leave approval, piece-rate/payroll calculations.

### P2: Make It A Full ERP Platform

1. Dealer/B2B portal.
2. Customer/B2C portal.
3. Product catalogue with pricing tiers, media, documents, vehicle fitment, and quote request.
4. Integrations: accounting export, WhatsApp Business, email, barcode hardware, payment gateway, courier APIs.
5. Multi-factory/franchise capabilities if required.

## Implementation Plan

Phase 1: Operational safety and test harness

- Add Playwright or equivalent smoke tests for owner, worker, inspector, and public verification flows.
- Add deterministic seed data for tests.
- Add production maintenance endpoint policy and audit records.
- Fix lint warnings.

Phase 2: CRM and quotation

- Add Lead, Activity, Quotation, QuotationItem, Account, Contact, and PriceList where needed.
- Build `/owner/crm` with Leads, Customers, Accounts, Quotations, and Customer 360.
- Convert accepted quote to SalesOrder using existing production flow.

Phase 3: Finance/accounting-lite

- Build `/owner/finance`.
- Generate GST invoices from sales orders/dispatches.
- Record payments and receivables aging.
- Add purchase invoice and payables screens.
- Export CSV/PDF for accountant handoff.

Phase 4: Inventory and warehouse execution

- Add barcode/QR labels for items and bins.
- Add batch/lot issue and remaining-quantity views.
- Add QC hold/rejected stock statuses.
- Add cycle counting and adjustment approval.

Phase 5: Planning, analytics, workforce

- Add production analytics and WIP aging.
- Add capacity and scheduling views.
- Add attendance, shift, leave, productivity, and piece-rate payroll.

Phase 6: External portals and integrations

- Dealer portal.
- Customer portal.
- WhatsApp/email/courier/payment/accounting integrations.

## Bottom Line

Do not position Verity as an Odoo replacement today.

Position it as a domain-specific factory execution platform with a strong QC and production-floor foundation, then close the P0 gaps above before selling it as a real-world ERP. The shortest path to operational credibility is not more screens; it is a tested order-to-cash and procure-to-produce cycle with traceability, finance, permissions, and support processes proven end to end.
