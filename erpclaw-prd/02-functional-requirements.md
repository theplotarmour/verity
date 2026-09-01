# 02 Functional Requirements

## 1. Global Functional Contract

Every ERPClaw workflow must follow this lifecycle:

1. Resolve the company and relevant entities from the database.
2. Validate prerequisites, permissions, required fields, and domain invariants.
3. Preview high-impact or ambiguous outcomes in business language.
4. Execute through a domain action in a single transaction.
5. Return a concise business result with optional reference IDs.
6. Write audit records and expose linked records on detail pages.

## 2. Setup & Admin

### 2.1 Database Initialization

The product must initialize a local ERP database with core tables, migrations, registry values, default currency/UoM/payment terms, security scaffolding, and audit logging.

Functional requirements:

- Initialize a new SQLite database by default.
- Support PostgreSQL with the same logical behavior.
- Run pending migrations idempotently and record them in a migration ledger.
- Report dry-run migration plans before applying.
- Detect schema version and installation health.
- Seed demo data only when requested.
- Provide install guide, tutorial, onboarding steps, and status checks.

Acceptance:

- Re-running initialization without force must not destroy existing books.
- `--force` equivalent behavior is destructive and requires explicit confirmation.
- Failed migrations stop loudly with enough detail to resume or repair.

### 2.2 Company Setup

Functional requirements:

- Create, update, list, and view companies.
- Capture legal name, abbreviation, base currency, country, fiscal year start month, tax ID/EIN, default accounts, default cost center, default warehouse, inventory policy, negative stock policy, and freeze date.
- When exactly one company exists, read workflows may default to it.
- When multiple companies exist, write workflows must require exact company selection.
- Company setup can trigger chart setup and defaults seeding.

Acceptance:

- Similar or partial company names must not be auto-corrected for writes.
- Missing default accounts must block dependent transactions with actionable messages.

### 2.3 Registries, Custom Fields, And Settings

Functional requirements:

- Manage account type and voucher type registries.
- Soft-disable registry values instead of deleting historical meaning.
- Define custom fields for core tables and store typed values.
- Expose custom fields in relevant selling, buying, and inventory forms.
- Configure regional settings and advance accounts.

Acceptance:

- Removing a custom field definition must not delete historical values without an explicit migration plan.
- Voucher/account registry validation must prevent values incompatible with downstream reports.

## 3. Users, Security, Credentials, And Audit

Functional requirements:

- Add/update/get/list users.
- Set passwords using secure hashing.
- Add/list roles and assign/revoke roles.
- Seed standard permissions.
- Link/unlink Telegram users and check Telegram permission.
- Store credentials encrypted.
- List/get credentials only with redacted preview.
- Delete credentials through confirmation-gated flow.
- Migrate credentials and import master key from backup.
- Provide audit log search by date, entity, action, and user.

Acceptance:

- No password, credential, SSN, or master key value appears in table cells, logs, or assistant summaries.
- Audit rows must include action, entity type, entity id, user, timestamp, previous values, new values, and description where available.

## 4. General Ledger

### 4.1 Chart Of Accounts

Functional requirements:

- Set up a US GAAP chart of accounts.
- Add/update/get/list accounts.
- Support parent/child account hierarchy.
- Capture root type, account type, currency, balance direction, frozen/disabled flags, group flag, tree depth, and company.
- Freeze/unfreeze accounts.
- Get balances.
- Import chart of accounts and opening balances.
- Validate account type compatibility with root type.

Acceptance:

- Account type reclassification with posted entries requires deliberate intent because reports re-read history under the new type.
- Frozen accounts reject postings for frozen periods.

### 4.2 GL Entries

Functional requirements:

- Post balanced GL entries.
- Reverse GL entries rather than editing submitted rows.
- List entries with company, posting date, voucher, account, dimensions, debit, credit, and currency.
- Check GL integrity.
- Support dimensions such as department, project, location, fund, and cost center.
- Revalue foreign balances and post FX effects.

Acceptance:

- Every posting must balance by company/currency according to the GL invariant.
- Direct unbalanced ledger writes are impossible from the UI.
- Dimension keys must be registered before use.

## 5. Journal Entries

Functional requirements:

- Add, update, get, list, submit, cancel, amend, delete draft, and duplicate journal entries.
- Support entry types, posting date, naming series, currency, exchange rate, remark, status, amended-from, company, total debit, total credit, and line items.
- Tag journal lines or headers with dimensions at booking time.
- Create intercompany journal entries.
- Create, update, list, get, process, and delete recurring templates.
- Support CWIP asset tagging for qualifying entries.

Acceptance:

- Submitted journal entries are immutable; amendments create traceable new records.
- Deleting is limited to drafts.
- Recurring processing must be idempotent for a period.

## 6. Payments And Reconciliation

Functional requirements:

- Add/update/get/list/submit/cancel/delete payment entries.
- Capture payment type, posting date, party type, party, paid-from account, paid-to account, paid amount, received amount, currency, exchange rate, reference number/date, status, unallocated amount, and company.
- Allocate payments to invoices.
- Support payment deductions for TDS, commissions, early payment discounts, write-offs, and other short-pay cases.
- Create payment ledger entries only through supported payment flows.
- Report outstanding balances.
- List open advances and apply advances to invoices.
- Reconcile payments and run bank reconciliation.
- Write off one open invoice at a time with reason and bad-debt account.

Acceptance:

- A short payment plus deduction can fully clear an invoice when the combined amount equals the invoice residual.
- Cancelling a payment reverses allocations and deduction effects.
- Unallocated advances remain visible until applied.
- No-cash write-off is separate from cash payment with deduction.

## 7. Tax

Functional requirements:

- Add/update/get/list/delete tax templates.
- Resolve tax templates deterministically.
- Calculate tax.
- Add/list tax categories and tax rules.
- Add item tax templates.
- Add withholding categories, groups, and entries.
- Get withholding details.
- Record 1099 payments and generate 1099 data.
- Run tax summary reports.

Acceptance:

- Rule priority and specificity must determine tax resolution.
- Submitted voucher tax breakdowns must not change after template edits.
- Withholding thresholds must be enforced by fiscal year and category.

## 8. Financial Reports

Functional requirements:

- Trial balance.
- Profit and loss.
- Balance sheet.
- Cash flow.
- General ledger report.
- Party ledger report.
- Multi-dimensional trial balance.
- Dimension balance report.
- AR aging.
- AP aging.
- Budget vs actual.
- Tax summary.
- Payment summary.
- GL summary.
- Comparative P&L.
- Overdue checks.

Acceptance:

- P&L grouped by department/project/cost center/location/fund must use registered dimensions and action-supported grouping, not ad hoc SQL.
- Reports must expose `(untagged)` buckets when transactions lack requested dimensions.
- Aging reports must reconcile to party ledger/open invoices.

## 9. Selling

### 9.1 Customers And Sales Partners

Functional requirements:

- Add/update/get/list/import customers.
- Store email and phone as structured fields.
- Assign a default price list.
- Add/list sales partners.
- Apply customer custom fields.
- Check credit limit and place customer on hold/suspend/restore.

Acceptance:

- Customer balance and credit availability must be read from the ERP before making credit decisions.

### 9.2 Quotations

Functional requirements:

- Add/update/get/list/submit quotations.
- Convert quotations to sales orders.
- Snapshot item names, rates, taxes, customer, and terms at document creation.

Acceptance:

- Conversion must preserve accepted quotation commercial terms.

### 9.3 Sales Orders

Functional requirements:

- Add/update/get/list/submit/cancel/amend/close sales orders.
- Support blanket orders and creation from blanket orders.
- Reserve/project stock where relevant.
- Block direct stock issue when an open sales order should be fulfilled through delivery.

Acceptance:

- Amendments must not erase submitted history.
- Closing an order should leave delivered/invoiced facts intact.

### 9.4 Fulfillment

Functional requirements:

- Create/get/list/submit/cancel delivery notes.
- Add/get/list packing slips.
- Issue stock through the order-backed delivery flow.

Acceptance:

- Delivery submission posts inventory effects and accounting effects where perpetual inventory requires it.
- Cancelling delivery reverses stock movement through supported reversal.

### 9.5 Sales Billing

Functional requirements:

- Create/update/get/list/submit/cancel sales invoices.
- Create/list credit notes.
- Update invoice outstanding with payment-ledger adjustment.
- Generate recurring invoices from templates.
- Create/list/cancel intercompany invoices.
- Configure dunning levels and run dunning cycles.

Acceptance:

- Submitted invoices post GL entries and become receivable.
- Cancelling reverses, not deletes.
- Dunning skips missing email/template with an explanatory note, not a failed run.

## 10. Buying

### 10.1 Suppliers

Functional requirements:

- Add/update/get/list/import suppliers.
- Store email and phone as structured fields.
- Apply supplier custom fields.

Acceptance:

- Supplier identity must be resolved from current ERP records before creating a purchase document.

### 10.2 Procurement Planning

Functional requirements:

- Add/submit/list/get material requests.
- Create purchase orders from material requests.
- Add/submit/list RFQs.
- Add/list supplier quotations.
- Compare supplier quotations.

Acceptance:

- Creating a PO from a material request updates ordered quantity and supports partial ordering.

### 10.3 Purchase Orders

Functional requirements:

- Add/update/get/list/submit/cancel/close purchase orders.
- Support blanket POs, creation from blanket POs, creation from sales orders, and drop-ship orders.

Acceptance:

- PO state must distinguish draft, submitted/open, partially received, closed, and cancelled business meaning.

### 10.4 Receiving

Functional requirements:

- Create/get/list/submit/cancel purchase receipts.
- Enforce receipt tolerance.
- Support three-way match policy.
- Add/get/list/cancel landed cost vouchers.

Acceptance:

- PO-backed goods must be received via purchase receipt, not bare stock receipt.
- Landed cost cancellation reverses both GL and valuation effects.

### 10.5 Purchase Billing

Functional requirements:

- Create/update/get/list/submit/cancel purchase invoices.
- Create debit notes.
- Create recurring AP bill templates and generate recurring bills.
- Support CWIP asset hook for standalone capitalizable cost bills.

Acceptance:

- Submitted purchase invoices create payable balances.
- Recurring bill generation must not duplicate the same cycle.

## 11. Inventory

### 11.1 Item Master

Functional requirements:

- Add/update/get/list/import items.
- Resolve loose/plural item names before transactional use.
- Add/list item groups.
- Add item attributes.
- Create/generate/list variants.
- Add/list item suppliers.
- Set purchase UoM.
- Store custom item fields.

Acceptance:

- Item resolution with multiple matches asks the user to choose.
- Zero or explicit rates are respected according to pricing rules.

### 11.2 Warehouses

Functional requirements:

- Add/update/list warehouses.
- Support default warehouse configuration.
- Support putaway rules and target warehouse routing.

Acceptance:

- Warehouse-level rules must apply deterministically by item match, item group match, then priority.

### 11.3 Stock Entries

Functional requirements:

- Add/get/list/submit/cancel stock entries.
- Support receive, issue, transfer, manufacture, repack, subcontract, and consume entry types.
- Provide shortcuts for repack and material consumption.
- Retire direct stock-ledger entry actions and steer to stock entry/reconciliation/revaluation.

Acceptance:

- Stock entry submission must keep inventory quantity and accounting valuation synchronized.
- Repack must preserve total input/output value within tolerance.

### 11.4 Reservations, Picking, And Availability

Functional requirements:

- Add/release/list reservations.
- Create pick lists from sales orders.
- Add pick list items.
- Submit, mark picked, complete, and cancel pick lists.
- Project quantity using actual stock minus active reservations.
- Complete pick lists into delivery notes.

Acceptance:

- Reservations cannot exceed available stock.
- Cancelled pick lists release reservations.

### 11.5 Batches, Serials, Alternatives, Pricing

Functional requirements:

- Add/list batches.
- Add/list serial numbers.
- Add/list/remove item alternatives and pick best alternative by priority and availability.
- Add price lists, item prices, and pricing rules.
- Resolve selling price from explicit rate, customer/default price list, standard rate, then zero.

Acceptance:

- Alternative relationships are directional.
- Pricing rule validity windows and minimum quantity are enforced.

### 11.6 Reconciliation, Revaluation, Reorder

Functional requirements:

- Add/submit stock reconciliation.
- Revalue stock.
- List/get/cancel stock revaluations.
- Check reorder levels.
- Provide stock balance and stock ledger reports.

Acceptance:

- Reconciliation and revaluation corrections leave audit history and accounting trace.

## 12. Billing & Metering

Functional requirements:

- Add/update/get/list meters.
- Add/list meter readings.
- Add single and batch usage events.
- Add/update/get/list rate plans.
- Rate consumption for flat, tiered, volume discount, time of use, demand, prepaid credit, and hybrid plans.
- Create/list/get billing periods.
- Run billing.
- Generate invoices.
- Link/unlink billing period invoices.
- Sync billing period status.
- Add billing adjustments and prepaid credit.
- Get prepaid balance.
- List/get/resume billing runs.

Acceptance:

- Time-of-use tiers cover 24 hours without gaps/overlaps.
- Hybrid plans cannot recursively contain hybrid or prepaid-credit components.
- Prepaid credit over-limit is explicit and does not deduct balance.
- Billing runs are crash-safe and resume without duplicates.

## 13. Advanced Accounting

### 13.1 Revenue Recognition

Functional requirements:

- Add/update/get/list revenue contracts.
- Add/list/satisfy performance obligations.
- Add/list variable consideration and modify contracts.
- Calculate revenue schedules.
- Generate revenue entries.
- Recognize schedule entries.
- Update obligations and schedule amounts.
- Provide revenue waterfall and summary reports.

Acceptance:

- Revenue entries must tie to contract/obligation/schedule records and remain auditable.

### 13.2 Lease Accounting

Functional requirements:

- Add/update/get/list leases.
- Classify leases.
- Calculate ROU asset and lease liability.
- Generate amortization schedules.
- Record lease payments.
- Provide maturity, disclosure, and summary reports.

Acceptance:

- Lease calculations must preserve inputs, assumptions, and generated schedule lines.

### 13.3 Intercompany And Consolidation

Functional requirements:

- Add/update/get/list intercompany transactions.
- Approve and post intercompany transactions.
- Add/list transfer price rules.
- Run IC reconciliation and elimination reports.
- Add/list consolidation groups and group entities.
- Add currency translation.
- Run consolidation.
- Generate elimination entries.
- Run consolidation trial balance and summary.
- List/remove elimination surplus.
- Provide standards compliance dashboard.

Acceptance:

- Only posted intercompany transactions are eligible for elimination.
- Re-running elimination must report created/already_eliminated/nothing_to_eliminate without duplication.
- Surplus elimination deletion is report-only until confirmed.

## 14. HR & Payroll

### 14.1 HR Master Data

Functional requirements:

- Add/update/get/list employees.
- Record lifecycle events.
- Add/list employee bank accounts.
- Add/get/list employee documents.
- Check expiring documents.
- Add/list departments and designations.

Acceptance:

- SSN and sensitive employee data are encrypted/redacted.

### 14.2 Leave, Attendance, Shifts, Expenses

Functional requirements:

- Add/list leave types.
- Add leave allocations and get leave balance.
- Add/approve/reject/list leave applications.
- Mark and bulk-mark attendance.
- Add holiday lists.
- Add/update/list shift types.
- Assign/list shifts.
- Add regularization rules and apply regularization.
- Add/submit/approve/reject/update/list expense claims.

Acceptance:

- Approval/rejection workflows preserve request history.
- Attendance corrections are traceable.

### 14.3 Payroll

Functional requirements:

- Add/list salary components.
- Add/get/list salary structures.
- Add/list salary assignments.
- Add federal/state tax slabs.
- Update employee state config.
- Update FICA and FUTA/SUTA config.
- Add overtime policy, calculate overtime, calculate retro pay.
- Create payroll runs.
- Generate/get/list salary slips.
- Submit/cancel payroll runs.
- Generate W-2 data.
- Generate NACHA file.
- Add/update/get/list garnishments.
- Show amendment history.

Acceptance:

- Retro pay calculation is idempotent.
- Salary slips include pending retro pay and revert on cancelled run.
- NACHA generation requires explicit confirmation.

## 15. Module Management And Schema

Functional requirements:

- Install/remove/update/list/search modules.
- Show available modules from signed registry.
- Show module status, dependencies, category, tags, version, and action count.
- Rebuild action cache.
- List all actions and profiles.
- Onboard from natural language business type.
- Validate modules against constitution.
- List constitution articles.
- Build table registry.
- Plan/apply/rollback schema changes.
- Detect schema drift.
- Regenerate skill metadata.
- Update/rollback foundation files.
- Verify trust-root fingerprint.

Acceptance:

- Installation, removal, schema rollback, and foundation rollback require explicit confirmation.
- Registry source and file hashes must be verified before installing or replacing files.
- Schema migrations are forward-only unless a module supplies a safe rollback plan.
