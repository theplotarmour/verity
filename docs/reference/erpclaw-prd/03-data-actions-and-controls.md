# 03 Data Actions And Controls

## 1. Entity Catalog

The core dashboard and UI metadata define these entity groups:

| Area | Entities |
|---|---|
| Company | company |
| Currencies | currency, exchange_rate |
| Defaults | payment_terms, uom, uom_conversion |
| Users & Security | erp_user, role, audit_log |
| Accounting | account, gl_entry, fiscal_year, period_closing_voucher, cost_center, budget, naming_series |
| Payments | payment_entry, payment_allocation, payment_deduction, payment_ledger_entry |
| Tax | tax_template, tax_rule, item_tax_template, tax_category, tax_withholding_category, tax_withholding_entry, tax_withholding_group |
| Inventory | item, item_group, warehouse, stock_entry, stock_reconciliation, stock_revaluation, batch, serial_number, price_list, item_price, pricing_rule |
| Sales | customer, sales_partner, quotation, sales_order, delivery_note, sales_invoice, credit_note |
| Buying | supplier, material_request, request_for_quotation, supplier_quotation, purchase_order, purchase_receipt, landed_cost_voucher, purchase_invoice |
| Billing | meter, usage_event, billing_period, rate_plan, rate_tier, prepaid_credit_balance, recurring_invoice_template, billing_adjustment |
| HR & Payroll | employee, employee bank account, employee document, department, designation, leave type, leave allocation, leave application, attendance, holiday list, shift type, shift assignment, expense claim, salary component, salary structure, salary assignment, tax slab, payroll run, salary slip, W-2 data, garnishment |
| Advanced Accounting | revenue contract, performance obligation, variable consideration, revenue schedule, lease, intercompany transaction, transfer price rule, consolidation group, group entity, currency translation, elimination entry |
| Module/System | module, action cache, profile, schema plan, schema drift, trust root, foundation manifest |

## 2. Command Domain Catalog

| Domain | Command count from source | Product responsibility |
|---|---:|---|
| Setup & Admin | 66 | Foundation initialization, companies, defaults, users, roles, credentials, backups, audit, registry admin |
| General Ledger | 30 | Accounts, postings, fiscal years, cost centers, budgets, dimensions, naming, imports |
| Journal Entries | 16 | Manual and recurring JEs, lifecycle, amendments, intercompany JE |
| Payments | 16 | Payment entries, allocations, deductions, advances, reconciliation, write-offs |
| Tax | 17 | Tax templates, rules, categories, withholding, 1099 |
| Financial Reports | 21 | Statements, aging, budget, tax/payment/GL summaries, dimension reports |
| Selling | 57 | Customers, quotations, sales orders, delivery, invoices, credit notes, dunning |
| Buying | 51 | Suppliers, material requests, RFQs, purchase orders, receipts, bills, landed costs |
| Inventory | 65 | Items, warehouses, stock entries, balances, reservations, batches, serials, prices, revaluation |
| Billing & Metering | 24 | Meters, usage, rate plans, billing periods, runs, invoices, prepaid credit |
| Advanced Accounting | 48 | Revenue recognition, leases, intercompany, consolidation, compliance |
| HR & Payroll | 68 | Employees, leave, attendance, expenses, salary, payroll, W-2, NACHA, garnishments |
| Module Management & Schema | 22 | Modules, action cache, validation, schema plans, trust-root reconciliation |
| Meta / OS infrastructure | internal | Action discovery, module validation, schema migration, invariant checks |

## 3. Data Integrity Rules

- Money must use decimal-safe storage and exact arithmetic.
- Every submitted financial transaction must be balanced.
- Every cross-table transaction must either fully commit or fully roll back.
- Submitted GL rows are immutable.
- Stock quantity and stock value must reconcile to stock movements.
- Direct retired stock-ledger gateways must refuse and steer to stock-entry flows.
- Submitted sales/purchase documents snapshot commercial terms.
- Tax calculations must snapshot rates and amounts on vouchers.
- Payment ledger summary must reconcile to allocations/deductions.
- Billing periods must not generate duplicate invoices.
- Module installation must satisfy dependency order and trust checks.

## 4. Permission And Confirmation Model

### 4.1 Routine actions

Routine reversible work proceeds when the user clearly asked for it: adding records, creating drafts, submitting routine documents, cancelling reversible documents, approving leave, rejecting claims, running ordinary reports, running billing, and onboarding.

### 4.2 Destructive/high-impact actions

The following require explicit second confirmation:

- Close fiscal year.
- Restore database.
- Install module.
- Remove module.
- Roll back foundation.
- Generate NACHA file.
- Force initialize database.
- Schema rollback.
- Credential deletion or master-key operations.
- Cleanup backups that permanently delete files.

### 4.3 UI copy requirement

Confirmation copy must describe the business consequence:

- Good: "This will close FY2026 and block ordinary postings into that year."
- Bad: "Run close-fiscal-year?"

## 5. Audit Requirements

Every action writes an audit trail appropriate to its impact:

- Actor.
- Timestamp.
- Company.
- Entity type and ID.
- Action class.
- Previous values and new values for mutable records.
- Reason for reversals, write-offs, delinks, cleanup, cancellation, and rollback.
- Linked generated artifacts such as invoices, vouchers, payroll slips, backup files, or ACH files.

## 6. Report Requirements

Reports must support:

- Company filter.
- Date range.
- Fiscal period shortcuts.
- Currency display.
- Dimension filters.
- Drilldown to source documents.
- Export where data sensitivity allows.
- Empty state that distinguishes no data from permission-blocked data.
- Reconciliation footer where relevant.

## 7. Assistant Requirements

The assistant rail must:

- Resolve entities from live database reads.
- Ask for disambiguation when multiple matches exist.
- Stop when an exact company name is not found.
- Translate internal status into business language.
- Hide internal action names.
- Summarize completed business results.
- Include reference IDs only as secondary support.
- Refuse to infer balances, duplicate status, or existence from memory.

## 8. Error And Exception Requirements

| Error class | Required behavior |
|---|---|
| Validation | Highlight fields and explain required correction |
| Missing prerequisite | Link to setup page/action |
| Ambiguous entity | Ask the user to choose from current records |
| Permission denied | Explain inaccessible action without exposing hidden data |
| GL invariant failure | Block commit, show reconciliation diagnostics |
| Stock invariant failure | Block commit, show item/warehouse/reservation context |
| Duplicate billing | Block generation and offer link/manual sync path |
| Migration failure | Stop, record failed migration, show recovery path |
| Network denied | Explain which optional action needs network and why |
| Confirmation missing | Present business consequence and wait for user consent |

## 9. Import/Export Requirements

- Chart of accounts import.
- Opening balances import.
- Item import.
- Customer import.
- Supplier import.
- Bank statement import/reconciliation.
- CSV export for safe list/report pages.
- PDF/print output for invoices, receipts, bills, payroll slips, tax summaries, and statements where appropriate.

## 10. Integration Requirements

Core allowed network use:

- Public exchange-rate fetch.
- User-approved module install/update from approved GitHub sources.

Optional integrations from source positioning:

- Stripe marketplace and Stripe sync.
- Shopify sync.
- Telegram user linking.
- Email queue/drip campaign workers when optional alert/growth modules exist.

All integrations require credential redaction and auditable setup.

## 11. Performance Requirements

- Dashboard KPIs load independently so one failing domain does not blank the dashboard.
- Lists paginate by default.
- Reports stream or batch for large ledgers.
- Billing runs and recurring jobs record per-target progress for resume.
- Search and entity resolution must return enough information to disambiguate without loading entire ledgers.

## 12. Verity Implementation Notes

If implemented in Verity, ERPClaw should map to:

- Capability-private modules for ERP domains, not platform broadening for every ERP object.
- Metadata-driven route generation where `UI.yaml` can seed domain/entity/action definitions.
- Verity command runtime for write actions.
- Verity query/report definitions for read models.
- Existing tenant/RLS/security invariants for multi-client isolation.
- Existing semantic token and dashboard primitives for UI.
- Explicit status taxonomy: source-derived PRD, planned Verity capability, partially implemented, built, proven.
