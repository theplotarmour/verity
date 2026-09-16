# 01 Information Architecture And Pages

## 1. App Shell

The ERPClaw workspace has four persistent regions:

- **Global header:** company selector, fiscal period indicator, database health, search, assistant entry, notifications, user menu.
- **Primary navigation:** dashboard plus the 29 core domains from `UI.yaml`.
- **Content workspace:** list, detail, form, report, wizard, or batch-run surface.
- **Assistant rail:** natural-language command intake, entity resolution prompts, action previews, confirmations, and completed business summaries.

## 2. Dashboard Page

### 2.1 Purpose

The dashboard is the operating cockpit. It must summarize setup health, bookkeeping workload, stock/sales/buying status, tax setup, billing status, and exceptions.

### 2.2 KPI Sections

| Section | KPI cards | Drilldown |
|---|---|---|
| Setup | Companies, Users, Accounts, Open Periods, Frozen Accounts | Companies, Users, Accounts, Fiscal Years |
| Journals & Payments | Journal Entries, Draft Journal Entries, Payments, Draft Payments, Submitted Payments, Unreconciled Entries | Journal Entries, Payments, Unallocated Payments |
| Tax | Tax Templates, Tax Rules, Tax Categories | Tax setup lists |
| Inventory | Items, Warehouses, Draft Stock Entries | Item, Warehouse, Stock Entry lists |
| Sales | Customers, Draft Quotations, Open Sales Orders, Unpaid Sales Invoices | Customer, Quotation, Sales Order, Sales Invoice lists |
| Buying | Suppliers, Draft Purchase Orders, Pending Receipts, Unpaid Purchase Invoices | Supplier, Purchase Order, Purchase Receipt, Purchase Invoice lists |
| Billing | Meters, Draft Meters, Rate Plans, Billing Periods | Meter, Rate Plan, Billing Period lists |

### 2.3 Quick Actions

The dashboard exposes quick actions for setup company, new account, fiscal year, cost center, GL integrity check, journal entry, payment entry, reconcile payments, bank reconciliation, tax template/rule/category, withholding category, item, warehouse, stock entry, customer, quotation, sales order, supplier, purchase order, meter, usage event, and rate plan.

Quick actions open guided forms or assistant-backed routines. They must validate required context before execution and must return a business-readable summary.

### 2.4 Dashboard States

- **Empty install:** shows setup company, seed defaults, setup chart of accounts, and import opening balances as the first actions.
- **Single company:** auto-scopes dashboard to that company.
- **Multiple companies:** requires explicit company selection for writes and report filters.
- **Warning state:** draft documents, unreconciled entries, overdue invoices, missing default accounts, failed billing runs, expiring credentials.
- **Error state:** database unavailable, migration pending/failing, GL integrity failure, missing permissions.

## 3. Domain Pages

Each domain page has a consistent structure:

- Domain header with label, description, key actions, and context filters.
- Entity tabs or cards for the domain entities.
- List/table section with saved filters and create buttons.
- Recent activity/audit section.
- Assistant suggestions relevant to the domain.
- Empty-state guidance based on prerequisites.

## 4. Core Domain Map

| Domain | Route | Entities | Required sections |
|---|---|---|---|
| Company | `/erpclaw/company` | company | Company list, setup wizard, defaults summary, legal/tax identity, default accounts |
| Currencies | `/erpclaw/currencies` | currency, exchange_rate | Enabled currencies, exchange-rate table, fetch/import actions, effective-date history |
| Defaults | `/erpclaw/defaults` | payment_terms, uom, uom_conversion | Terms, units, conversions, seeded-defaults status |
| Users & Security | `/erpclaw/users-security` | erp_user, role, audit_log | Users, roles, assignments, permissions seed, audit log, credential redaction policy |
| Chart of Accounts | `/erpclaw/chart-of-accounts` | account | Account tree, account editor, freeze/unfreeze, balances, import |
| General Ledger | `/erpclaw/general-ledger` | gl_entry | GL entry list, posting batches, immutable entry detail, integrity check |
| Fiscal Periods | `/erpclaw/fiscal-periods` | fiscal_year, period_closing_voucher | Fiscal years, close/reopen controls, validation results, closing vouchers |
| Budgeting | `/erpclaw/budgeting` | cost_center, budget | Cost centers, budgets, budget-vs-actual drilldowns |
| System | `/erpclaw/system` | naming_series | Naming series, schema version, installation status, backups, regional settings |
| Entry | `/erpclaw/payments` | payment_entry, payment_allocation, payment_deduction | Payment entry list, allocation panel, deduction/write-off panel, reconciliation |
| Terms | `/erpclaw/terms` | payment_terms | Terms list, due-day/discount terms form, usage references |
| Ledger Entry | `/erpclaw/payment-ledger` | payment_ledger_entry | Party ledger rows, voucher links, delink state, allocation trace |
| Template | `/erpclaw/tax-templates` | tax_template, tax_rule, item_tax_template | Tax template editor, rule matrix, item tax templates |
| Category | `/erpclaw/tax-categories` | tax_template, tax_rule, tax_category | Tax category list, tax rule conditions, priority ordering |
| Withholding Category | `/erpclaw/withholding` | tax_withholding_category, tax_withholding_entry, tax_withholding_group | Withholding setup, thresholds, groups, entries, 1099 support |
| Item Master | `/erpclaw/items` | item, item_group | Item list, groups, variants, suppliers, custom fields, pricing hooks |
| Warehousing | `/erpclaw/warehouses` | warehouse | Warehouse list/tree, default warehouse, putaway context |
| Stock Transactions | `/erpclaw/stock-transactions` | stock_entry, stock_reconciliation, stock_revaluation | Stock entries, reconciliation, valuation, reorder checks |
| Tracking | `/erpclaw/tracking` | batch, serial_number | Batch list, serial number list, item/warehouse filters |
| Pricing | `/erpclaw/pricing` | price_list, item_price, pricing_rule | Price lists, customer tiers, item prices, pricing rule evaluation |
| Customers | `/erpclaw/customers` | customer, sales_partner | Customer list, detail, default price list, credit status, sales partners |
| Sales | `/erpclaw/sales` | quotation, sales_order | Quotations, sales orders, conversion, amendment, close/cancel |
| Fulfillment | `/erpclaw/fulfillment` | delivery_note | Delivery notes, packing slips, stock issue guards |
| Sales Billing | `/erpclaw/sales-billing` | sales_invoice, credit_note | Sales invoices, credit notes, submit/cancel, outstanding updates |
| Suppliers | `/erpclaw/suppliers` | supplier | Supplier list, detail, contact fields, custom fields |
| Purchasing | `/erpclaw/purchasing` | material_request, request_for_quotation, supplier_quotation, purchase_order | Material requests, RFQs, supplier quote comparison, purchase orders |
| Receiving | `/erpclaw/receiving` | purchase_receipt, landed_cost_voucher | Receipts, landed costs, tolerance, three-way match |
| Purchase Billing | `/erpclaw/purchase-billing` | purchase_invoice | Purchase invoices, debit notes, recurring bills, CWIP hooks |
| Meter | `/erpclaw/meters` | meter, usage_event, billing_period | Meters, readings/events, periods, billing runs |
| Rate Plan | `/erpclaw/rate-plans` | rate_plan, rate_tier, prepaid_credit_balance | Plan builder, tier editor, prepaid balances, rating preview |
| Subscription Billing | `/erpclaw/subscription-billing` | recurring_invoice_template, billing_adjustment | Recurring templates, adjustments, generated invoices, run history |

## 5. Entity Page Pattern

Every entity must have:

- **List view:** key columns, status badges, company filter, search, date filters where applicable, empty state.
- **Create form:** required fields, defaults, reference pickers, validation, draft support where the domain supports draft.
- **Detail view:** header, status, primary fields, financial totals, linked records, actions, audit.
- **Edit form:** limited to mutable fields and blocked after terminal/submitted state where applicable.
- **Action panel:** submit, cancel, amend, close, allocate, reconcile, generate, import, export, or report actions depending on entity.
- **Error model:** validation errors at fields, business-rule errors at form/action level, invariant failures as blocking alerts.

## 6. Page-Level Requirements By Domain

### 6.1 Company

The Company page manages legal business identity, base currency, country, fiscal year start, tax ID/EIN, default receivable/payable/income/expense/bank/cash/cost-center/warehouse accounts, round-off account, exchange gain/loss account, perpetual inventory, negative-stock policy, and account freeze date.

Sections: Company Information, Default Accounts, Advanced Settings, Activity.

Actions: set up company, update company, list/get company, seed defaults, seed demo data, setup chart of accounts, update regional settings.

Acceptance: a newly created company must be able to proceed to chart setup; missing default accounts must show as setup warnings, not silent failures.

### 6.2 Currencies

The Currencies page manages enabled currencies and dated exchange rates. It supports manual rates and fetched rates, with source tracking and effective dates.

Sections: Enabled Currencies, Exchange Rates, Rate History, Fetch Results.

Acceptance: foreign currency transactions must resolve a rate for the posting date or block with a clear message.

### 6.3 Defaults

Defaults centralizes payment terms, units of measure, and UoM conversions. It must separate global units from item-specific conversions.

Sections: Payment Terms, Units, Unit Conversions, Seed Status.

Acceptance: conversion factors must be positive decimal values; whole-number units must reject fractional quantities where used.

### 6.4 Users & Security

Users & Security manages users, roles, assignments, permissions seeding, Telegram links, credentials, and audit log access.

Sections: Users, Roles, Role Assignment, Credentials, Telegram Links, Audit Log.

Acceptance: passwords and credentials never render in clear text; credential reads return existence/redacted preview only.

### 6.5 Chart Of Accounts

The chart page shows a hierarchical account tree with root type, account type, parent, currency, balance direction, frozen/disabled flags, and balances.

Sections: Account Tree, Account Details, Balances, Import, Integrity.

Acceptance: account type changes must validate root compatibility; reclassifying posted accounts requires explicit intent.

### 6.6 General Ledger

The GL page is read-heavy and audit-focused. It lists immutable entries, voucher links, dimensions, posting dates, debit/credit totals, and reversal links.

Sections: Entry List, Voucher Filter, Dimension Filter, Integrity Check, Export.

Acceptance: submitted GL rows cannot be edited; reversals create new entries.

### 6.7 Fiscal Periods

Fiscal Periods manages fiscal years, period close validation, closing vouchers, close/reopen actions, and account freeze effects.

Sections: Fiscal Years, Closing Checklist, Closing Voucher, Reopen History.

Acceptance: closing is blocked by validation failures and requires destructive-class confirmation.

### 6.8 Budgeting

Budgeting manages cost centers and budgets and links to budget-vs-actual reports.

Sections: Cost Centers, Budgets, Variance Summary.

Acceptance: inactive cost centers remain reportable for historical transactions.

### 6.9 Payments

The Entry page should be labelled Payments in product navigation. It manages payment entries, allocations, deductions, advances, reconciliation, and write-offs.

Sections: Payments, Allocations, Deductions, Open Advances, Bank Reconciliation, Party Outstanding.

Acceptance: short-pay with deduction must clear invoice residual in one payment when amounts balance; unallocated advances remain visible until applied.

### 6.10 Tax

Tax pages manage templates, rules, categories, item tax templates, withholding categories, withholding entries, groups, 1099 reporting, and tax summaries.

Sections: Templates, Rule Conditions, Categories, Withholding, 1099, Tax Summary.

Acceptance: rule resolution must be deterministic by priority and scope; tax values on submitted vouchers remain snapshotted.

### 6.11 Inventory

Inventory pages cover items, item groups, attributes, variants, suppliers, purchase UoM, warehouses, stock entries, stock balance, projected quantity, putaway, pick lists, reservations, alternatives, batches, serials, prices, revaluation, reconciliation, and reorder checks.

Sections: Item Master, Warehouses, Stock Entries, Stock Balance, Reservations, Pick Lists, Tracking, Pricing, Revaluation.

Acceptance: purchased goods must flow through PO-backed receipt when an open PO exists; direct stock ledger gateways are retired and must steer users to supported flows.

### 6.12 Sales

Sales pages cover customers, sales partners, quotations, sales orders, blanket orders, delivery notes, packing slips, sales invoices, credit notes, recurring invoices, intercompany invoices, credit controls, and dunning.

Sections: Customers, Quotations, Orders, Fulfillment, Invoices, Credit Notes, Credit Control, Dunning.

Acceptance: quotation-to-order, order-to-delivery, delivery-to-invoice, and invoice-to-payment flows preserve price/tax/customer snapshots.

### 6.13 Buying

Buying pages cover suppliers, material requests, RFQs, supplier quotations, purchase orders, blanket POs, drop-ship/back-to-back ordering, purchase receipts, purchase invoices, debit notes, landed costs, receipt tolerances, three-way match, and recurring bills.

Sections: Suppliers, Material Requests, RFQs, Purchase Orders, Receipts, Landed Costs, Bills, Debit Notes, Recurring Bills.

Acceptance: landed cost must update both accounting and inventory valuation in one transaction.

### 6.14 Billing & Metering

Billing pages cover meters, meter readings, usage events, rate plans, tiers, prepaid credit, billing periods, billing runs, invoice generation, manual invoice linking, adjustments, and recovery/resume.

Sections: Meters, Usage, Rate Plans, Rating Preview, Billing Periods, Runs, Generated Invoices, Adjustments.

Acceptance: a period cannot be billed twice; manual invoice linking exists to prevent duplicate generation.

### 6.15 Advanced Accounting

Advanced Accounting pages cover ASC 606 revenue contracts, performance obligations, variable consideration, revenue schedules, recognition entries, ASC 842 leases, ROU asset/liability calculations, lease reports, intercompany transactions, transfer pricing, consolidation groups, group entities, currency translation, eliminations, and compliance dashboards.

Sections: Revenue Recognition, Lease Accounting, Intercompany, Consolidation, Compliance.

Acceptance: eliminations occur at consolidation layer, not inside operating-company books.

### 6.16 HR & Payroll

HR & Payroll pages cover employees, bank accounts, documents, lifecycle events, departments, designations, leave, attendance, shifts, regularization, expenses, salary components, salary structures, assignments, tax slabs, FICA/FUTA/SUTA, overtime, retro pay, payroll runs, salary slips, W-2, NACHA, garnishments, and amendment history.

Sections: Employees, Documents, Org Structure, Leave, Attendance, Shifts, Expenses, Salary Configuration, Payroll Runs, Tax Outputs, Garnishments.

Acceptance: SSN displays last four only; generating bank-payment files requires explicit confirmation.

### 6.17 Module Management & Schema

Module Management handles install/remove/update/list/search/status, action cache rebuild, profiles, onboarding, module validation, constitution articles, table registry, schema plan/apply/rollback/drift, skill regeneration, foundation update/rollback, and trust-root verification.

Sections: Installed Modules, Available Modules, Module Detail, Schema Plans, Drift, Trust Root, Foundation Reconcile.

Acceptance: install/remove/schema rollback/foundation rollback are confirmation-gated and audited.
