# 00 Product Vision

## 1. Product Definition

ERPClaw is an AI-native ERP where the assistant is the primary operating surface and the database is the system of record. The user should be able to describe a business action in plain English, and the system should resolve the right entity, perform validations, write the transaction, post accounting effects, and return a business-readable outcome.

The dashboard is secondary but complete. It exists for review, exception handling, batch operations, reports, and users who need structured views of the same source of truth. It must not become a parallel forms-first ERP that bypasses the assistant contract.

## 2. Product Goals

- Run a small or mid-sized business from natural language without sacrificing audit-grade accounting.
- Keep the ERP database authoritative for every company, customer, supplier, item, invoice, bill, payment, employee, payroll run, module, credential, and report.
- Make every financial write transactional, balanced, reversible by explicit reversal, and traceable.
- Let users install one foundation and add vertical capability modules only when needed.
- Provide a generated dashboard that exposes every entity and action in predictable pages without custom screen work for every module.
- Preserve business language in all user-facing copy. Internal action names are implementation details.

## 3. Primary Users

| User | Need | Product response |
|---|---|---|
| Owner / founder | Know cash, receivables, payables, revenue, stock, and payroll status quickly | Dashboard KPIs, assistant summaries, financial reports, overdue checks |
| Bookkeeper | Record invoices, bills, payments, adjustments, month-end routines | Sales, buying, payments, journals, GL integrity, reconciliation pages |
| Operations manager | Manage products, stock, warehouses, orders, receipts, deliveries | Inventory, sales, buying, fulfillment, receiving pages |
| Finance controller | Maintain chart of accounts, fiscal years, dimensions, budgets, close/reopen periods | GL, fiscal, budgeting, reports, advanced accounting |
| HR/payroll admin | Manage employees, leave, attendance, expenses, salary slips, tax filings | HR and payroll workflows with encrypted sensitive data |
| System admin | Manage users, roles, credentials, backups, modules, migrations | Users & Security, System, Module Management pages |

## 4. Non-Goals

- Do not expose internal command names as product vocabulary.
- Do not answer from memory when an ERP entity, balance, duplicate, or count can be queried.
- Do not create file-based shadow books.
- Do not allow direct, unbalanced stock ledger or GL row writes as user workflows.
- Do not install modules, restore backups, close years, generate bank files, or roll back foundation files without the required confirmation class.
- Do not treat optional module descriptions as built Verity functionality until implemented or integrated.

## 5. Product Principles

### 5.1 AI-first but ledger-hard

Natural language is the interface, not the source of truth. Every answer about records must ground itself in current database reads. Every write must route through a validated action, not raw SQL or inferred state.

### 5.2 Business language

The user sees "send the invoice", "record the payment", "restore from backup", and "install the module". The UI may store routing metadata, but visible text must explain the business outcome.

### 5.3 Reversal over mutation

Submitted accounting records are never edited in place. Cancellations and corrections create reversing entries, amendments, allocations, delinks, or adjustment records as appropriate.

### 5.4 One transaction per business fact

Cross-table effects must commit atomically: invoices with ledger entries, stock receipts with valuation, payments with allocations/deductions, landed costs with FIFO revaluation, payroll submissions with slip status and ACH export readiness.

### 5.5 Metadata-driven expansion

The foundation exposes a stable command/entity/report contract. Optional modules add tables, actions, UI metadata, and tests without requiring a second product architecture.

## 6. Trust, Security, And Runtime Requirements

- Local-first storage is the default; cloud/network behavior must be explicit and bounded.
- SQLite and PostgreSQL must be supported through the same query abstraction.
- Amounts use decimal-safe storage and display; no float-based money.
- IDs are UUID-style opaque identifiers.
- Sensitive fields, including credentials and employee SSNs, are encrypted or redacted.
- GL entries are immutable after submission.
- Backups, restores, credential changes, master-key operations, destructive schema operations, and bank-payment file generation require a second confirmation.
- Routine reversible actions may proceed when the user clearly asked for them.
- Audit logs capture what changed, when, by whom, and why where a reason is required.

## 7. Global UX Requirements

- The first viewport is an operating dashboard, not a marketing page.
- Global navigation groups pages by business domain, matching the domain list in `UI.yaml`.
- Every list page supports search, filtering, sorting, pagination, export where safe, and a create action when the entity is createable.
- Every detail page shows status, primary fields, linked documents, audit history, and available actions.
- Every form shows required fields, default values, validation messages, and linked-record pickers.
- Destructive and high-impact actions use explicit confirmation copy that names the business consequence.
- Report pages expose filters, grouped outputs, totals, drilldowns, export, and period comparison where meaningful.

## 8. Success Metrics

- A user can set up a company, seed defaults, create accounts, add customers/items/suppliers, invoice a customer, receive payment, buy stock, pay a supplier, run reports, and inspect audit history without leaving the product model.
- Every financial report reconciles to immutable GL entries.
- Inventory valuation reconciles to stock movements and GL impact.
- Dashboard KPIs agree with drilldown lists.
- Module install/update/remove flows are discoverable but gated.
- No user-facing workflow requires knowledge of internal action names.
