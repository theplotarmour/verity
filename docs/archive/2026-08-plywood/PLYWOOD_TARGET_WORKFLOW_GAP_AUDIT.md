# Plywood Target Workflow — Codebase Gap Audit

**Audit date:** 30 August 2026  
**Repository:** `/Users/naksh/Downloads/verity`  
**Target specification:** `pasted-text.txt` supplied with the request  
**Audit type:** Read-only product, workflow, data-model, authorization, accounting, tax, and test audit

> This report is the only artifact created by this audit. No application code, schema, migration, configuration, or test was changed. The repository already contained unrelated modified and untracked files; those were left untouched.

## 1. Executive verdict

The repository contains a useful Plywood foundation, but it does **not** currently implement the requested end-to-end operating model:

> Buy → Receive → Stock → Sell → Reserve → Issue Goods → Invoice → Collect → Account → Tax → Close

The current implementation is best described as a partial inventory/order/invoice prototype hosted on a capable multi-tenant platform. Catalogue records, godown-like locations, weighted-average inventory, purchase and sales orders, reservations, invoices, payments, party ledger entries, domain events, and basic overview metrics exist. However, the connected business-document chain is incomplete, several implemented rules contradict the target, and important authorization and financial-integrity controls are missing.

The product should not be extended by simply adding the missing screens. The highest-risk gaps are below the UI layer:

1. Plywood operations ignore organization/location row scopes.
2. Credit exposure excludes unpaid invoices and can fall when an order is dispatched.
3. Sales invoices can be raised before credit approval, reservation, or goods issue.
4. There are no first-class Goods Receipt or Goods Issue documents and stock movements lack source-document traceability.
5. Tax, input tax credit, return preparation, accounting-period close, credit notes, and debit notes are absent.
6. Invoice, payment, allocation, and duplicate-document concurrency protections are insufficient.
7. Business legal identity and GST registration data do not exist as durable master data.
8. The current Reports page is restaurant reporting, while Logistics is implemented and visible despite the target explicitly excluding it.

### Coverage assessment

| Area | Status | Audit conclusion |
|---|---|---|
| Platform tenancy and capability foundation | Partial/usable | Strong reusable base, but activation and scoped authorization are incomplete for this workflow. |
| Client onboarding and settings | Major gap | No guided Plywood onboarding, client-admin bootstrap, legal identity, GST, financial-year, or document-series setup. |
| Navigation and business terminology | Major gap | Generic platform surfaces and Logistics remain visible; Suppliers, Customers, Tax, Close, People, and business settings are missing. |
| Catalogue and pricing | Partial | CRUD exists; detail views, effective-dated pricing, stock/order/movement drill-downs, and tax-rule ownership are missing. |
| Godowns and inventory | Partial/high risk | WAC and balances exist; source traceability, rack balances, incoming/reserved/available views, and safe reservation concurrency do not. |
| Purchasing | Partial | Basic PO and receipt command exist; receipt documents, invoice capture, three-way match, history, due dates, and ITC do not. |
| Sales and credit | Partial/critical defects | Orders and reservations exist, but exposure, approval, partial issue, and invoice sequencing violate core target rules. |
| Finance and ledgers | Partial/high risk | Invoices, payments, and party entries exist; legal snapshots, due dates, allocation, immutable corrections, GL, and close controls do not. |
| Tax and compliance | Absent | Tax is calculated from global configuration; ITC, exceptions, reconciliation, returns, and filing workflow are absent. |
| Reports and close | Absent/wrong capability | Current report is for dine-in restaurant sales; period close and lock do not exist. |
| Roles and audit | Major gap | Technical permission editor only; client role administration, business activities, complete audit coverage, and row scope enforcement are missing. |
| Automated acceptance coverage | Major gap | Existing Plywood test calls commands directly and validates the old Logistics-based flow, not the required browser workflow. |

## 2. What can be reused

The target does not require a ground-up rewrite. These existing components are valuable foundations if hardened:

- Tenant isolation infrastructure, RLS migrations, actor resolution, capability registry, command/query registries, and domain-event plumbing.
- Plywood brand, product, supplier, customer, supplier/customer price, purchase order, sales order, reservation, stock ledger, stock balance, invoice, payment, and party-ledger models.
- Weighted-average-cost stock receipt logic and append-style stock ledger design.
- Explicit order state-transition helper and transaction-wrapped commands.
- Order-line price snapshots, so later master-price changes do not automatically alter an existing order.
- Tenant/year invoice counters and printable invoice UI.
- HQ client, membership, role, and capability administration primitives.
- Existing UI component system and shell.

These foundations reduce implementation effort, but they do not resolve the gaps documented below.

## 3. Release-blocking findings

### P0-01 — Row-scoped authorization is not enforced by Plywood

**Evidence:** `src/server/platform/query.ts` exposes `ctx.scope()`, but Plywood query handlers in `src/server/capabilities/plywood/*.ts` do not use it. `src/server/platform/command.ts` authorizes entity/verb pairs but does not apply an equivalent row-scope assertion, and Plywood commands do not call `assertRowInScope`.

**Impact:** A role limited to one organization or location can read tenant-wide stock, orders, invoices, and financial totals. If it possesses an entity action, knowledge of another record UUID can allow cross-scope mutation inside the same tenant. Composite overview results also expose data outside the permission used to enter the page.

**Required change:** Define row ownership for every Plywood entity and projection; enforce scope in every query and command; authorize each component of composite metrics; add negative tests for organization-, godown-, and self-scoped roles.

### P0-02 — Credit exposure becomes incorrect after dispatch

**Evidence:** `customerExposurePaise` in `src/server/capabilities/plywood/trading.ts` sums non-completed sales orders but not unpaid invoices. Dispatch completes the order. Customer-list exposure uses the same incomplete basis.

**Impact:** Dispatch can reduce displayed exposure to zero even when the customer still owes the invoice. Subsequent orders may pass the credit check incorrectly.

**Required change:** Adopt one documented formula, such as unallocated receivables plus approved/uninvoiced commitments, with explicit rules preventing double counting. Recheck it atomically at submission, override, reservation, and goods issue.

### P0-03 — Invoice sequencing bypasses credit and stock controls

**Evidence:** Sales invoice creation in `src/server/capabilities/plywood/finance.ts` blocks only draft/cancelled orders. A `pending_credit` or merely approved order can be invoiced, and invoice quantity is based on ordered rather than issued quantity. Purchase invoices can be raised for draft or cancelled POs because no valid-state guard exists.

**Impact:** Financial documents can be created without approval, reservation, receipt, or issue; invoiced quantities can exceed physical goods movement; target audit continuity is broken.

**Required change:** Invoice only eligible receipt/issue quantities; support partial documents; make state and quantity invariants transactional and database-backed; prevent duplicate or over-invoicing.

### P0-04 — No first-class Receipt or Goods Issue documents

**Evidence:** Receipt mutates `PlywoodPurchaseOrderLine.qtyReceived` and writes a generic stock movement. Dispatch writes outward movements and marks the order complete. `PlywoodStockLedgerEntry` has no source document, source line, receipt, issue, reversal, or correlation fields. There are no Goods Receipt/Goods Issue models or routes.

**Impact:** Users cannot open a receipt/issue, prove who handled a line, partially reverse it, print it, match it to an invoice, or drill from stock movement to its business cause. “Enter once and propagate” cannot be audited.

**Required change:** Introduce immutable receipt/issue headers and lines, business numbers, dates, actors, locations/racks, source-order links, reversal links, and source references on every stock movement.

### P0-05 — Financial records are not safely immutable

**Evidence:** The finance migration adds a `BEFORE DELETE` invoice trigger but not an update prohibition. Invoice lines and payments have no comparable immutable-posting protection. Corrections through credit/debit notes and reversals do not exist.

**Impact:** An invoice or payment can be changed without a balanced correction document; ledger history can diverge from the source document and filed tax data.

**Required change:** Define draft versus posted immutability precisely. Posted changes must occur only through reversal, credit note, debit note, payment reversal, or controlled reopen with immutable audit linkage.

### P0-06 — Concurrency can over-reserve or overpay

**Evidence:** Reservation availability is read without locking the relevant balances/reservations. The payment command checks current paid total without locking the invoice/payment set. First balance creation has an acknowledged insert race. One-invoice-per-order is checked in application code without a unique database constraint.

**Impact:** Concurrent requests can reserve the same available stock, overpay an invoice, create duplicate invoices, or fail unpredictably while creating a first balance.

**Required change:** Use a documented locking strategy or serializable invariant, database uniqueness/check constraints where possible, command idempotency keys, and concurrent acceptance tests.

### P0-07 — Tax/compliance architecture is missing

**Evidence:** Global configuration defaults provide CGST/SGST/IGST rates. There is no effective-dated HSN tax rule, purchase tax-line model, ITC eligibility, tax exception, GSTR-1/GSTR-3B preparation, portal import/reconciliation, filing status, or return export.

**Impact:** The system cannot produce defensible GST postings or the target compliance workflow. Purchase invoices currently record total with zero tax breakdown, so expected ITC cannot be computed.

**Required change:** Establish GST registration ownership, supply/place-of-supply validation, effective-dated tax rules, immutable invoice tax lines, ITC treatment, exception workflows, and return-period artifacts before building tax screens.

### P0-08 — Accounting period close does not exist

**Evidence:** There is no accounting-period model, `/close` route, lock date, close checklist, reopen workflow, or posting guard.

**Impact:** Backdated stock, invoice, payment, tax, and correction activity can alter a reported period after review or filing.

**Required change:** Define period boundaries, prerequisites, blockers, authorized close/reopen actions, reason capture, and enforcement in every posting command.

### P0-09 — Business legal identity is not modeled

**Evidence:** `Tenant` stores name/time zone/custom fields; seller GSTIN, PAN, legal/trade name, registered address, registration state, currency, financial year, and invoice series are not structured master data. The invoice page reads the live tenant name and a raw configured state code.

**Impact:** Legally required document identity is incomplete and historical invoices can change when live master data changes.

**Required change:** Add versioned business/GST-registration profiles and snapshot all legally relevant seller, buyer, address, and tax identity fields when a document is posted.

### P0-10 — Current route set contradicts the requested product

**Evidence:** `src/server/capabilities/plywood/index.ts` exposes Logistics; transporter and shipment models/server/UI exist; overview includes delivery/in-transit metrics. Conversely, Suppliers, Customers, Tax, Close, People/Roles, and business settings routes are absent. `src/app/(shell)/reports/page.tsx` calls dine-in `salesSummary` and describes restaurant takings.

**Impact:** Users see a different business product from the supplied specification, and a report can return unrelated capability data.

**Required change:** Decide migration/removal behavior for Logistics data, remove its navigation and workflow dependencies, replace the Reports implementation, and add the intended business navigation and authorization model.

## 4. Detailed gap matrix

### 4.1 Platform operator and client onboarding

| Target requirement | Current state/evidence | Gap and required change |
|---|---|---|
| Create client with initial admin | HQ form captures only name/time zone; `createClient` creates tenant, root org, and operator membership | Add initial client-admin identity/invitation, contact details, activation status, resend/revoke, and acceptance audit. |
| Select Plywood and auto-enable shared dependencies | Capability activation refuses missing dependencies; fresh-tenant test manually enables them | Add atomic dependency plan/preview and activation; failure must roll back as one operation. |
| First login guided onboarding | First client landing page is generic platform overview; no onboarding state found | Add resumable onboarding checklist and readiness gate for business, tax, FY, godown, opening stock, parties, roles, and document series. |
| Friendly client administration | People/roles administration exists only under HQ | Add client-owned People, Roles, invitation, suspension, and access-review routes. Platform operator access must remain separately auditable. |
| No platform internals | Shell exposes generic Overview/Workspace and optional Configuration; empty godown/order states link to generic Locations | Replace with business language and business-owned routes. Do not expose raw entities, capability keys, or configuration keys to normal users. |

### 4.2 Navigation and shell

- Plywood navigation is grouped under technical contribution areas; group headings are screen-reader-only in `ShellChrome`, so users do not see the requested business categories.
- Shell search is visually present but has no query state or results behavior.
- The notification bell links to Audit and there is no notification inbox, unread state, or deep-linked task list.
- `/` is a generic platform dashboard that directly reads organizations, activations, permissions, approvals, sync exceptions, assets, locations, and evidence. It is not the target Plywood Overview and does not apply per-projection authorization.
- `/configuration`, `/locations`, `/assets`, and `/workspace` remain reachable as generic concepts.

Required navigation:

`Overview; Catalogue; Suppliers; Purchases; Customers; Sales; Stock; Godowns; Finance; Ledgers; Tax & Compliance; Reports; People & Roles; Business Settings; Audit`

`Close Period` must be placed explicitly—either under Finance or Tax & Compliance—because the target later requires `/close` but omits it from its final navigation list.

### 4.3 Overview

The current `/overview` supplies today sales/purchases, stock value, low-stock count, receivables/payables, pending deliveries, and in-transit shipments.

Missing or incorrect:

- Monthly sales and purchase comparison.
- Open sales and purchase orders.
- Orders pending credit approval.
- Orders awaiting reservation and goods issue.
- Incoming, reserved, available, and low-available stock.
- Overdue receivables, payables due this week, collections, and due-date aging.
- Tax liabilities, expected ITC, filing exceptions, and close readiness.
- Actionable drill-downs using the exact same canonical filters/formulas as destination lists.
- Permission-aware composition; Invoice read permission alone must not disclose unrelated stock and payables.
- Shipment/delivery metrics must be removed if the target’s no-Logistics decision stands.

### 4.4 Catalogue and pricing

Existing catalogue CRUD covers brand/product attributes including HSN, board type, thickness, grade, size, reorder level, and active status.

Gaps:

- No product detail route or tabs for current sell price, supplier/customer prices, godown stock, incoming, reserved, available, open orders, or movement history.
- Supplier and customer price records are single upserts; updating overwrites current value. There are no effective dates, history, future prices, reason, actor, or trend.
- No standard/base selling-price ownership is clearly defined.
- No bulk import/export, duplicate detection, unit conversion, or opening-data process.
- Product tax behavior depends on global rates rather than effective-dated HSN rules.
- No safeguards describe what may change after a product has posted history.

### 4.5 Godowns, racks, and stock

Existing generic `Location` records act as godowns, with Plywood rack records. This is insufficient for the target:

- No dedicated godown type/profile, create workflow, manager assignment, address, or default rules.
- No godown detail route with stock, incoming POs, racks, movement history, value, or low-stock count.
- `StockBalance` is product/location only; rack-level quantity and value cannot be reported.
- Receipt and direct stock forms do not consistently select a rack.
- A stock movement rack is not proven to belong to the selected location, allowing inconsistent location/rack pairs.
- Stock screen shows on-hand and WAC only; target requires On hand, Reserved, Available, Incoming, Reorder Level, and Low Stock.
- Low-stock logic compares on-hand, not canonical available quantity.
- Submitted PO outstanding quantity is not surfaced as incoming stock.
- Product movement query exists but has no user route, source-document references, or related-document drill-down.
- Direct generic Receive/Issue controls allow users to bypass PO receipt and sales goods-issue lifecycles. Business movements should require an allowed source or a separately controlled adjustment reason.
- Direct issues check on-hand rather than available and can consume stock reserved for another order.
- Damage/adjustment/return reasons are optional or too generic; customer returns lack customer, original order/issue, quantity cap, valuation, disposition, and financial-note linkage.
- No transfer workflow is specified or implemented. The target must decide whether inter-godown transfer is required.

Canonical inventory equations should be defined once and reused everywhere:

```text
on_hand  = sum(posted physical stock movements)
reserved = sum(active, unissued reservation quantities)
available = on_hand - reserved
incoming = sum(submitted/approved PO quantity not yet received or cancelled)
low_stock = available < reorder_level
```

Every projection must define time, status, unit, and reversal treatment.

### 4.6 Suppliers and purchasing

Suppliers are embedded in the Purchases desk rather than being a first-class navigation area. Purchase orders have basic create/submit/receive/cancel commands, but the target workflow is not represented.

Missing or defective:

- Supplier list/detail routes, default terms, contact/address structure, status, outstanding payables, open POs, invoices, payments, ledger, and price history.
- Effective-dated supplier prices and purchase-price trend.
- Human PO number, order date policy, expected date, terms, delivery address snapshot, notes/attachments, and complete status timeline.
- Multi-line PO UX even though the server accepts multiple lines.
- Draft/history tabs; the query only lists open orders, hiding completed/cancelled history.
- PO detail route, activity trail, receipts, invoices, payments, and ledger relations.
- Receipt entry constrained to PO lines and remaining quantities. Current UI chooses from the full catalogue and only receives one line per submission.
- Receipt number/date, supplier challan, rack/bin, condition, attachments, receiver, partial receipt detail, reversal, and printable record.
- Structured supplier invoice number, invoice date, due date, taxable/tax lines, attachment, and duplicate-invoice prevention.
- Purchase invoice lines; current purchase invoice stores a total and zero tax breakdown.
- Two-/three-way matching among PO, receipt, and invoice, tolerance policy, price/quantity/tax exceptions, override reason, and approval.
- Expected ITC and ITC eligibility.
- Payable due-date aging, due-this-week view, payment terms, supplier advances, and allocation.
- Purchase invoice valid-state guard and a database uniqueness/idempotency policy.

### 4.7 Customers, sales, credit, and goods issue

Customers are embedded in Sales. Sales orders, price resolution, credit check, reservation, and dispatch exist, but several target invariants are absent.

Missing or defective:

- Customer list/detail routes with addresses, GST, state, terms, credit limit, current exposure, headroom, open orders, invoices, payments, ledger, and price history.
- Effective-dated customer pricing.
- True draft order lifecycle. Current create command immediately produces approved or pending-credit state.
- Human SO number, dates, partial fulfillment status, notes, and complete history tabs.
- A precise exposure formula including receivables and uninvoiced commitments without double counting.
- Atomic credit recheck and reasoned override at the necessary control points.
- Approval inbox, maker/checker restrictions, override amount, expiry, notifications, and escalation.
- Business permissions for create order, submit, approve credit, reserve, issue, cancel, invoice, collect, and write off. Current permissions collapse multiple operations into generic `ActionExecute` on an entity.
- Partial reservation, per-line quantities, reservation across godowns/racks, expiry, substitution, release reasons, and safe concurrent allocation.
- Partial goods issue. Current dispatch issues all remaining lines, releases all holds, and completes the order.
- Goods Issue header/lines, issue number/date, picker/checker, rack, vehicle/reference if desired outside Logistics, printing, reversal, and source links.
- Invoice eligibility from issued quantity, partial/multiple invoice policy, and unique constraints.
- Returns tied to original issue/invoice and credit-note consequences.

The current state vocabulary (`dispatching`, `qtyShipped`) also carries Logistics semantics and should be replaced with the agreed domain vocabulary, for example Draft → Pending Credit → Approved → Reserved/Part Reserved → Awaiting Issue → Part Issued → Fulfilled/Cancelled.

### 4.8 Finance, payments, and ledgers

Existing sales invoices calculate GST and create party-ledger entries; purchase invoices, payments, outstanding totals, and printable invoice pages exist. The following remain:

- Invoice status, due date, payment terms, posting date, external supplier invoice number, and structured attachment.
- Immutable seller/buyer legal-name, trade-name, GSTIN, PAN/address/place-of-supply snapshots.
- Line-level taxable value, discount, CGST/SGST/IGST rates and amounts, cess/rounding, and tax-rule source.
- Invoice issue only from eligible Goods Issue/Receipt quantities.
- Partial and multiple invoices with an explicit quantity-allocation model.
- Payment date supplied by the user; current record time defaults to now.
- Receipt/payment voucher number, bank/cash account, method validation, attachment, and reference uniqueness where applicable.
- Advances/on-account money, partial allocation across invoices, one payment allocated to many invoices, refunds, bounce, reversal, short payment, and write-off.
- Receivable/payable due-date aging; current “oldest” behavior is based on issue date because due dates do not exist.
- Credit notes, debit notes, return linkage, tax effect, stock effect, and ledger reversal.
- General ledger/chart of accounts, cash/bank book, taxes payable/receivable, COGS, inventory control, journal entries, trial balance, and opening balances if “Account” means full accounting.
- Party-ledger commercial commitments/open orders if required, separated from posted financial entries.
- Clickable ledger references to source invoice/payment/order; current ledger projection omits these IDs.
- Tenant-time-zone date boundaries. Current date/FY logic uses UTC in key places and may report the wrong day near Indian midnight.
- Margin must match revenue and COGS from the same issued/invoiced business flow; current outward stock movements can include direct unlinked issues.

### 4.9 Tax and compliance

No target tax workspace currently exists. Required capabilities include:

- `/tax` overview by registration and return period.
- Output tax from immutable sales invoice/note tax lines.
- Expected and eligible ITC from purchase invoice/receipt/match data.
- Tax exceptions for missing/invalid GSTIN, HSN, state, place of supply, rates, unmatched invoices, and duplicate external invoices.
- Explicit handling for unregistered parties, reverse charge, exempt/nil/non-GST items, cess, rounding, credit/debit notes, cancelled documents, and amendments.
- GSTR-1 preparation, validation, export, version, filing/acknowledgement, and lock linkage.
- GSTR-3B preparation and reconciliation.
- Portal/purchase-register import, matching confidence, manual match/split/unmatch, difference reasons, and audit.
- Multi-GST-registration decision. A Delhi business plus Noida godown can imply multiple registrations; a single business state code is not enough.

The current fallback behavior is unsafe: missing customer state can be treated as the business state, and missing configured rates can produce zero-tax behavior rather than a blocking exception.

### 4.10 Reports and period close

- Replace the current dine-in report with Plywood sales, purchase, stock, receivable, payable, margin, tax, exception, and audit reports.
- Define every report formula and reconcile it to underlying documents and ledger entries.
- Add filters, exports, pagination, totals, timezone, currency, and drill-down preserving the same filter context.
- Introduce a close checklist: unposted receipts/issues, unmatched invoices, tax exceptions, unreconciled payments, negative stock, draft notes, and filing readiness.
- Closing must lock posting dates; reopening must require authority, reason, timestamp, and complete audit.
- Decide whether close is monthly, GST-period, financial-period, or multiple coordinated locks.

### 4.11 Roles, permissions, audit, and notifications

The target asks for business activities. The current role editor exposes technical entity/verb/scope controls, and client users lack a client role-management route.

Required activity catalogue at minimum:

| Domain | Separately grantable activities |
|---|---|
| Catalogue | View, create/edit product, change standard price, import/export |
| Purchasing | Create/edit PO, submit PO, approve PO if required, receive goods, reverse receipt, capture supplier invoice, resolve match exception, pay supplier |
| Sales | Create/edit SO, submit, approve credit override, reserve stock, release reservation, issue goods, reverse issue, cancel order, raise invoice |
| Stock | View assigned godown, adjust, record damage, process return, transfer, view cost/value |
| Finance | View receivables/payables, record receipt/payment, allocate, reverse, write off, issue credit/debit note, view margin |
| Tax | View tax, resolve exceptions, prepare, approve, file/export, reopen |
| Administration | Manage people, roles, business settings, tax settings, periods, and document series |

Additional gaps:

- Warehouse/location scope must be both visible in UX and enforced server-side.
- Sensitive values such as cost, margin, credit limit, bank data, GST filings, and audit may require field-level permissions.
- Audit navigation currently appears for anyone with any readable permission and the page directly reads tenant-wide activity.
- Operational Audit displays raw UUIDs and command/entity keys, not human actor, business action, reason, document number, and related links.
- Domain events are emitted more broadly than Activity records, so receipts, invoices, payments, damage, returns, and many creates are absent from the user-facing audit table.
- No correlation ID connects order → reservation → issue → invoice → payment → ledger → tax.
- Only a low-stock notification exists; recipient selection is based on StockLedger Create rather than an explicit procurement activity. Credit, receipt, match, payment, tax, close, and exception notifications are absent.

## 5. Target-specification contradictions and decisions required

The supplied target is detailed, but these conflicts must be resolved before implementation. Coding around them would create inconsistent data and tests.

1. **Reservation arithmetic conflict:** One example starts with aggregate reserved 20 and adds 40, producing reserved 60/available 90. The later goods-issue example starts from reserved 40 and ends at reserved 0/available 110. If another reservation of 20 still exists, the correct aggregate result after issuing 40 is reserved 20 and available 90.
2. **Purchase invoice example conflict:** The PO/receipt example uses 100 sheets at ₹1,200, while the invoice posting example uses taxable value ₹113,280, equivalent to 96 at ₹1,180. State whether this is an intentional partial invoice/price variance scenario.
3. **Credit exposure formula:** Customer detail equates exposure with outstanding receivables, while the order example adds an order commitment. Define gross/pre-tax basis, approved/draft inclusion, reservation/issue timing, invoiced-order de-duplication, advances, disputed invoices, and credit notes.
4. **Commercial commitment versus financial ledger:** The target says draft orders create no financial ledger, but another matrix mentions ledger commitments. Use a separate commercial projection unless commitments are deliberately off-ledger accounting entries.
5. **Invoice immutability timing:** One section implies immutability on issue; another suggests only after close. Define Draft, Posted/Issued, Cancelled, and Corrected semantics.
6. **State vocabulary:** Pending Receipt/Part Received/Received/Invoiced/Paid, Awaiting Reservation/Reserved/Awaiting Goods Issue/Fulfilled, and existing implementation terms need one canonical state machine.
7. **Role vocabulary:** Warehouse Staff, Warehouse Manager, and Auditor are not consistently defined. Provide a complete role-to-activity matrix and maker/checker rules.
8. **Navigation ambiguity:** `/close` is required but omitted from the final nav; Tax & Compliance, `/tax`, and `/settings/tax` overlap.
9. **Godown scope:** The examples span Delhi and Noida while the tax model appears single-registration. Decide multi-state registration and stock-transfer requirements.
10. **Return/damage accounting:** Define inventory valuation, tax, credit/debit note, available/reserved effects, disposition, and approval behavior.
11. **Overview scope:** Some target metrics are mentioned outside the final card list. Freeze the final card/filter/drill-down catalogue.
12. **Supplier payment placement:** “Ageing updated” appears under a Tax column in one matrix and is likely a document error.

Other acceptance decisions still needed:

- Command idempotency, retry behavior, document-number gaps, and concurrency guarantees.
- Opening stock, opening receivables/payables, migration/import, and reconciliation cutover.
- Partial receipt, partial reservation, partial issue, partial invoice, over/short receipt, and tolerance rules.
- Weighted-average-cost treatment for purchase price variance, landed cost, return, damage, and backdated movement.
- Due-date and payment-allocation rules.
- Notification channels, recipients, deduplication, escalation, and service levels.
- Data retention, attachment storage, export, audit retention, performance, accessibility, offline behavior, and disaster recovery.

## 6. Required data-model evolution

This is a conceptual inventory, not a schema prescription.

1. `BusinessProfile`, `GstRegistration`, versioned address/legal identity, financial-year policy, currency, and document series.
2. Business `Godown` profile linked to platform Location; rack ownership and rack-level balance/projection.
3. Effective-dated `TaxRule` by HSN/supply context and immutable document tax lines.
4. Versioned/effective supplier and customer price records rather than destructive upsert.
5. PO/SO business numbers, dates, expected/due dates, terms, snapshots, attachments, and richer state history.
6. `GoodsReceipt`/line and `GoodsIssue`/line with reversal/correction relationships.
7. Stock movement source type/id/line, document number/date, correlation, reversal, and actor/reason requirements.
8. Purchase-invoice lines, supplier external number/date/due date, tax/ITC attributes, attachments, and match result/exception entities.
9. Sales/purchase invoice states, due terms, legal identity snapshots, issue/receipt allocations, unique/idempotency constraints, and note relationships.
10. Payment/receipt vouchers plus allocation lines, advances, bank/cash account, reversal, bounce, refund, and write-off.
11. Credit/debit notes and their stock, party-ledger, general-ledger, and tax effects.
12. Accounting periods, close checklist results, lock/reopen audit, and posting-date enforcement.
13. Tax return periods, prepared versions, exceptions, reconciliation imports/matches, exports, filing acknowledgement, and locks.
14. Business notification tasks with recipient, state, severity, due time, deep link, deduplication key, and resolution.
15. Correlation/causation IDs across all domain events and human-readable audit projections.

## 7. Recommended implementation sequence

### Phase 0 — Freeze business rules

Resolve the contradictions above; publish canonical document state machines, formulas, role matrix, GST registration scope, accounting boundary, correction policy, and partial-flow rules. Turn them into executable acceptance examples.

**Exit gate:** Every target example has unambiguous starting data, command, expected postings, expected states, and authorized actor.

### Phase 1 — Security and integrity foundation

Enforce row scopes for every Plywood read/write; split business activities; add idempotency, locks, uniqueness constraints, posted-document immutability, correction primitives, and tenant-time-zone posting rules.

**Exit gate:** Negative authorization and concurrent-command tests pass; no operation can over-reserve, overpay, duplicate-invoice, or mutate a posted record silently.

### Phase 2 — Business identity, onboarding, and navigation

Implement Plywood dependency activation, initial client admin, onboarding, business/GST/FY/document-series settings, friendly People/Roles, revised shell, search, notifications, and removal/migration of Logistics and generic platform surfaces.

**Exit gate:** A new client can reach a ready business workspace without operator-only or raw-configuration intervention.

### Phase 3 — Catalogue, godown, purchasing, and inventory chain

Add product/godown/supplier details, effective pricing, incoming/reserved/available projections, receipt documents, source-linked stock ledger, purchase invoice capture, matching, payables, and ITC basis.

**Exit gate:** A PO can be partially received and matched to a supplier invoice; every quantity/value is traceable and reversible.

### Phase 4 — Customer, sales, credit, reservation, and issue chain

Implement customer details, corrected exposure, approval workflow, safe partial reservation, Goods Issue, invoice eligibility from issued quantities, returns, and credit notes.

**Exit gate:** Credit cannot be bypassed; simultaneous reservations cannot oversell; invoice quantity never exceeds eligible issued quantity.

### Phase 5 — Finance and tax

Add due terms, allocation, advances, payment reversals, notes, legal snapshots, tax lines/rules, exceptions, ITC, return preparation, reconciliation, and exports. If full accounting is in scope, add balanced journals and chart-of-accounts integration here.

**Exit gate:** Source documents reconcile to party ledger, GL if applicable, stock valuation, and tax returns.

### Phase 6 — Reports, close, and operational audit

Replace restaurant reports, implement canonical drill-down reports, period checklist/lock/reopen, complete human-readable audit, and actionable notifications.

**Exit gate:** A period can be reviewed, closed, reproduced, exported, and reopened only through an audited authority path.

### Phase 7 — Migration and hardening

Migrate existing shipments/logistics data according to the chosen policy; backfill source references where defensible; flag unreconcilable legacy rows; conduct performance, accessibility, security, restore, and volume testing.

## 8. Required acceptance-test architecture

The existing `src/test/plywood-fresh-tenant-ui.test.ts` is useful as a command/query integration test, but it is not a browser workflow: it calls command/query keys directly, creates a generic Location directly, and validates the old Logistics flow. Existing generic shell/HQ browser tests do not cover Plywood operations.

Add the following layers:

1. **Pure rule tests:** tax determination, exposure, availability, incoming, WAC, aging, margin, match tolerances, and state transitions.
2. **Database invariant tests:** RLS/scope, uniqueness, immutability, balanced postings, closed-period refusal, receipt/issue quantity caps, and reversal lineage.
3. **Concurrency tests:** simultaneous reserve, receipt, issue, invoice, payment, series allocation, close, and retry/idempotency.
4. **Command-chain integration tests:** each fact entered once and verified in every downstream projection.
5. **Role tests:** positive and negative matrix for owner, sales, purchase, warehouse, finance, tax, auditor, and scoped variants.
6. **Real browser journeys:** new client onboarding; PO-to-payment; SO credit-to-collection; returns/notes; tax exception-to-return; close/reopen; deep-link and notification behavior.
7. **Reconciliation tests:** stock ledger equals balances; issued quantities equal source allocations; invoice/payment allocations equal outstanding; party ledger and GL agree; tax reports equal posted tax lines.
8. **Historical tests:** master-data changes never restate posted invoices, tax periods, or audit identity.

Minimum end-to-end acceptance should prove:

```text
PO submitted -> incoming increases
Receipt posted -> on_hand/WAC increase, incoming decreases, receipt and movement link both ways
Supplier invoice matched -> payable and expected ITC appear once
Supplier payment allocated -> payable/ageing/ledger update once

SO submitted -> atomic credit decision
Reservation -> reserved increases and available decreases without changing on_hand
Goods Issue -> on_hand and reservation decrease together, source issue is traceable
Sales invoice -> receivable/output tax arise only for eligible issued quantity
Receipt allocated -> outstanding/exposure/ledger update once

Tax preparation -> posted tax lines reconcile
Close -> all backdated posting commands refuse
Reopen -> reasoned, authorized, and auditable
```

## 9. Current validation baseline

These commands were run without modifying the codebase:

| Command | Result |
|---|---|
| `npm run lint` | Completed with 0 errors and 1 warning: React Compiler skips memoization around TanStack `useReactTable` in `src/components/ui/business/SmartTable.tsx:76`. |
| `npm run typecheck` | Failed on an unrelated, already-present OIDC test change: `src/test/oidc-provider.test.ts:176` passes a number where a string is required. |
| `npm test` | 37 files passed, 5 failed; 532 tests passed, 9 failed, 6 skipped. Several failures are environmental database credential/reachability failures. Non-environment failures include three shared-capability availability assertions and the platform-module conformance ceiling (28 versus 27). One foundation suite encountered a database deadlock. |

The current worktree contained unrelated identity/OIDC modifications and untracked artifacts before this report was created. The validation results are recorded as the repository baseline and are not caused by this audit.

## 10. Evidence index

Key implementation locations reviewed:

- `prisma/schema.prisma` — tenant and Plywood data models, especially Plywood models beginning around line 2032.
- `prisma/migrations/20260823100000_capability_registry/migration.sql` — capability dependency enforcement.
- `prisma/migrations/20260828050000_plywood_finance/migration.sql` — invoice/payment/ledger schema, RLS, and delete-only invoice trigger.
- `prisma/migrations/20260828070000_plywood_config_defaults/migration.sql` — global Plywood state and GST rate defaults.
- `src/server/platform/command.ts` and `src/server/platform/query.ts` — authorization/runtime behavior.
- `src/server/capabilities/plywood/index.ts` — capability registration, navigation, overview schedule, and low-stock notification.
- `src/server/capabilities/plywood/stock.ts` — movement, WAC, balances, low stock, returns, and movement query.
- `src/server/capabilities/plywood/trading.ts` — supplier/customer pricing, PO/SO, credit, reservation, receipt, dispatch, and order projections.
- `src/server/capabilities/plywood/finance.ts` — invoice, GST, payments, ledgers, owner console, and margin.
- `src/server/capabilities/plywood/logistics.ts` — excluded Logistics workflow.
- `src/app/(shell)/layout.tsx`, `src/components/shell/ShellChrome.tsx`, and `src/app/(shell)/page.tsx` — generic shell/navigation/search/platform overview exposure.
- `src/app/(shell)/overview/page.tsx` — current Plywood metrics.
- `src/app/(shell)/catalogue`, `godowns`, `stock`, `purchases`, `sales`, `finance`, `ledgers`, `logistics`, `reports`, `audit`, and `configuration` — current business UI coverage.
- `src/app/(hq)/hq/clients` — client creation, modules, memberships, and technical roles.
- `src/test/plywood-fresh-tenant-ui.test.ts` — current Plywood integration coverage.

## 11. Final conclusion

The current Plywood capability demonstrates that the platform can host the proposed product, but the target workflow is not yet present as a safe, connected business system. The most important next step is not broad screen construction; it is freezing the ambiguous business rules and then repairing authorization, document lineage, concurrency, credit, immutable accounting, and tax foundations.

Once those invariants exist, the current models and UI can be evolved in phases. Building the requested screens first would make the product appear complete while leaving the most consequential failures—cross-scope access, credit bypass, untraceable stock, inconsistent invoices, and unclosable tax periods—underneath.
