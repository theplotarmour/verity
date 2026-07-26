# Verity → Odoo-Class ERP: Complete Implementation Plan

Status: **Draft for review** · Branch: `updates` · Date: 2026-07-23
Reference: [odoo/odoo](https://github.com/odoo/odoo) module architecture
Companion: [erp-operational-benchmark-2026-07-23.md](erp-operational-benchmark-2026-07-23.md),
[remaining-gaps-implementation-plan.md](remaining-gaps-implementation-plan.md)

---

## 0. Approach

We adopt **Odoo's module decomposition as the target architecture** and adapt
each module to Verity's stack (Next.js 15 App Router, Prisma, Supabase Postgres,
server actions, the Surface/PageHeader/Modal design system, SSE live-bus). We do
**not** port Odoo's ORM or Python — we borrow its **domain model and workflow
semantics**, which are the industry-proven part.

Guiding rules:
- **One record, everywhere** — Verity's Item Master already mirrors Odoo's
  `product.template`/`product.product`. Extend that discipline to customers,
  invoices, and journal entries; never fork per-module.
- **Documents + lines** — Odoo's `*.order` + `*.order.line`, `account.move` +
  `account.move.line`. Verity follows this (SalesOrder/Item, PurchaseOrder/Item);
  reuse the shape for Quotation, Invoice, Payslip.
- **Derived, not stored, state** — Verity already derives production status from
  the job-card chain (`deriveProductionStatus`). Keep computing status; store
  only transactions.
- **Additive migrations** — every phase is a self-contained, shippable slice
  pushed per-feature to `updates`.

### Odoo module → Verity module map

| Odoo module | Core Odoo models | Verity today | Verity target |
|---|---|---|---|
| `crm` | `crm.lead`, `crm.stage`, `mail.activity` | `Deal` (thin) | Lead, Activity, pipeline (Phase 2) |
| `sale` | `sale.order(.line)`, `product.pricelist` | `SalesOrder(Item)` | + Quotation, PriceList |
| `product` | `product.template/product`, `uom.uom` | `ItemMaster`, `ProductVariant` | + UoM master, pricelists |
| `stock` | `stock.quant`, `stock.move(.line)`, `stock.lot`, `stock.picking` | `StockLedgerEntry`, `BinBalance`, `MaterialReservation` | + lots/batches, barcode, cycle counts, valuation layers |
| `purchase` | `purchase.order(.line)`, `product.supplierinfo` | `PurchaseOrder(Item)`, `Supplier` | + RFQ/approvals, vendor price lists, bills |
| `mrp` | `mrp.production`, `mrp.workorder`, `mrp.workcenter`, `mrp.bom` | `WorkOrder`, `JobCard`, `Department`, `BOM` | + work centers/capacity, routing ops, scheduling, scrap/OEE |
| `quality` | `quality.point`, `quality.check`, `quality.alert` | `QCTemplate`, `Inspection`, `ReworkRecord` | + quality alerts, NCR/CAPA, defect library |
| `account` | `account.move(.line)`, `account.payment`, `account.tax` | `SalesInvoice`, `PaymentReceipt`, `PurchaseInvoice` (no UI) | Full invoicing, payments, aging, GST |
| `hr`, `hr_attendance`, `hr_payroll` | `hr.employee`, `hr.attendance`, `hr.leave`, `hr.payslip` | `EmployeeProfile`, `Shift`, `AttendanceLog`, `LeaveApplication` | Operational HR loop + piece-rate payroll |
| `base` (`res.groups`, `ir.rule`) | groups, record rules | permission matrix in `settings` | Admin-editable groups + record rules + approvals |
| `portal`, `website_sale` | portal mixin, eCommerce | public `/verify` | Dealer + customer portals |

---

## 1. Manufacturing (Odoo `mrp`) — deepen the core

**Odoo reference:** a Manufacturing Order (`mrp.production`) explodes a BOM
(`mrp.bom` + operations) into Work Orders (`mrp.workorder`), each run at a Work
Center (`mrp.workcenter`) with a capacity, cost/hour, and OEE tracking
(`mrp.workcenter.productivity` logs productive/blocked time). Scrap
(`stock.scrap`) and unbuild are first-class.

**Verity today:** `WorkOrder` → `JobCard` per `Department` (the chain), `BOM`,
material reservation/consumption, per-department templates + supervisor approval.
This already exceeds a generic ERP for floor UX. Missing: work centers/capacity,
routing operation times, scheduling/promised dates, scrap, downtime/OEE.

**Target additions:**
```prisma
model WorkCenter {           // ~ mrp.workcenter (a machine/cell within a dept)
  id            String @id @default(cuid())
  factoryId     String
  departmentId  String
  name          String
  capacityPerHr Float  @default(0)   // units/hour
  costPerHr     Float  @default(0)
  active        Boolean @default(true)
}
model DowntimeLog {          // ~ mrp.workcenter.productivity (blocked reason)
  id           String @id @default(cuid())
  factoryId    String
  workCenterId String?
  jobCardId    String?
  reason       String            // BREAKDOWN, MATERIAL_WAIT, CHANGEOVER, NO_OPERATOR
  minutes      Float
  createdAt    DateTime @default(now())
}
model ScrapEntry {           // ~ stock.scrap
  id         String @id @default(cuid())
  factoryId  String
  jobCardId  String?
  itemId     String
  quantity   Float
  reason     String
  createdAt  DateTime @default(now())
}
```
- `Department` gains `WorkCenter[]`; `JobCard` gains optional `workCenterId`,
  `estimatedMins`, `actualMins` (already have `timeSpentMins`).
- `ProductionPlan`/`WorkOrder` gain `promisedDate`, `scheduledStart`.
- Scrap posts a `StockLedgerEntry` ADJUSTMENT (WASTAGE) — reuse existing path.

**UI:** capacity board per department/work center; WIP-aging list; bottleneck
highlight; downtime capture on the floor terminal; scrap button on the stage
screen. **Priority: P1.**

---

## 2. Sales & CRM (Odoo `crm` + `sale`)

**Odoo reference:** `crm.lead` moves through `crm.stage` (New → Qualified →
Proposition → Won), logs `mail.activity` (calls/emails/meetings). A won lead
becomes a `sale.order` (quotation states draft→sent→sale), priced by
`product.pricelist`, confirmed into delivery + invoice.

**Verity today:** `Customer` (order picker), `Deal` (no UI). No leads, activities,
quotations, price lists, or customer 360.

**Target — mirrors the earlier CRM spec (B2B + B2C):**
```prisma
enum CustomerType { B2B B2C }
enum LeadStage { NEW CONTACTED QUALIFIED QUOTED WON LOST }
model Account { id String @id @default(cuid()) factoryId String name String gstNumber String? creditLimit Float @default(0) paymentTerms String? priceListId String? ownerId String? /* ...contacts, customers, deals */ }
model Contact { id String @id @default(cuid()) factoryId String accountId String? name String phone String? email String? role String? isPrimary Boolean @default(false) }
model Lead { id String @id @default(cuid()) factoryId String name String phone String? company String? source String? type CustomerType @default(B2C) stage LeadStage @default(NEW) ownerId String? estimatedValue Float? convertedCustomerId String? }
model Quotation { id String @id @default(cuid()) factoryId String quoteNumber String @unique customerId String? leadId String? status String @default("DRAFT") validUntil DateTime? subtotal Float taxAmount Float total Float items QuotationItem[] }
model QuotationItem { id String @id @default(cuid()) quotationId String productVariantId String? description String quantity Float unitPrice Float taxRate Float @default(0) }
model Activity { id String @id @default(cuid()) factoryId String type String customerId String? leadId String? accountId String? subject String body String? actorId String? createdAt DateTime @default(now()) }
model PriceList { id String @id @default(cuid()) factoryId String name String entries PriceListEntry[] }
model PriceListEntry { id String @id @default(cuid()) priceListId String productVariantId String price Float }
```
`Customer` gains `type`, `accountId`, `ownerId`, `outstandingBalance`.

**UI (`/owner/crm`):** Leads kanban (Odoo pipeline), Deals, Customers +
**Customer 360** (orders/quotes/invoices/balance/activity/reorder), Accounts
(B2B), Quotation builder (reuse the variant search + line editor) → **accept →
SalesOrder** through the existing production studio. B2C walk-in fast path
(phone lookup → studio). **Priority: P0** (benchmark's first CRM gap).

---

## 3. Inventory & Warehouse Execution (Odoo `stock` + `stock_barcode`)

**Odoo reference:** on-hand is `stock.quant` per location/lot; every move is a
`stock.move`/`stock.move.line`; transfers are `stock.picking`; lots/serials are
`stock.lot` with removal strategies FIFO/FEFO; barcode app drives receipts,
internal transfers, deliveries, and cycle counts; valuation is layered
(`stock.valuation.layer`); landed costs allocate freight/duty.

**Verity today:** `StockLedgerEntry` (single mutation path), `BinBalance`
(available/qcHold/rejected buckets), warehouse hierarchy, reservations,
batch fields on ledger, item labels. Strong ledger; missing first-class lots,
barcode-first flows, cycle counts, valuation layers, landed cost.

**Target additions:**
```prisma
model StockLot {            // ~ stock.lot — a tracked batch/serial
  id           String @id @default(cuid())
  factoryId    String
  itemId       String
  lotNumber    String
  manufacturedAt DateTime?
  expiryDate   DateTime?
  supplierId   String?
  @@unique([itemId, lotNumber])
}
model CycleCount {          // ~ physical inventory adjustment session
  id         String @id @default(cuid())
  factoryId  String
  binId      String
  status     String @default("DRAFT") // DRAFT, COUNTED, APPLIED
  lines      CycleCountLine[]
  createdAt  DateTime @default(now())
}
model CycleCountLine { id String @id @default(cuid()) cycleCountId String itemId String countedQty Float systemQty Float }
```
- `StockLedgerEntry` gains `lotId?` (link the batch); `BinBalance` optionally
  keyed per lot for FEFO.
- **Barcode-first**: item QR labels already exist; add a scan-driven
  receive/issue/transfer flow (`stock_barcode`-style) on mobile — scan bin →
  scan item → qty. Reuse the existing scan handler pattern in InventoryClient.
- **Valuation**: add a lightweight `ValuationLayer` (qty in/out × rate) to
  compute moving-average / FIFO cost and COGS for finance/analytics.
- Cycle counts post `ADJUSTMENT` ledger entries with a reason + approval.

**Priority: P0/P1** (labels + batch issue + QC hold are P0; barcode app,
valuation layers, landed cost are P1).

---

## 4. Procurement (Odoo `purchase`)

**Odoo reference:** RFQ → `purchase.order` (approval by amount) → receipt
(`stock.picking`) → vendor bill (`account.move`), with vendor price lists
(`product.supplierinfo`), lead times, and vendor scorecards.

**Verity today:** `Supplier`, `PurchaseOrder(Item)` with `receivedQty`,
`PurchaseReceipt`, GRN → stock-in. Missing: RFQ/approval thresholds, vendor
price lists, bills/payables link, scorecards.

**Target:**
- `PurchaseRequest` already exists — wire an **approval rule** (amount
  threshold → `Approval` model already present) before a PO can be `SUBMITTED`.
- `SupplierPrice` (~ `product.supplierinfo`): `{ supplierId, itemId, price,
  minQty, leadTimeDays }` — auto-fill PO rates, suggest cheapest vendor.
- Receiving already posts stock; add **vendor bill** creation (Phase 5 finance)
  and a **vendor scorecard** (on-time %, reject % from QC-on-receipt).
**Priority: P1.**

---

## 5. Quality Management (Odoo `quality`)

**Odoo reference:** `quality.point` defines *when* a check triggers (per
operation/product); `quality.check` is an instance (pass/fail + measure);
`quality.alert` raises a non-conformance with a team, root cause, and corrective
action (NCR/CAPA).

**Verity today:** `QCTemplate`/`Checkpoint`/`Inspection`/`CheckpointSubmission`/
`ImageEvidence`/`ReworkRecord`, per-department templates + supervisor approval,
public passport verification. Strong. Missing: quality alerts/NCR-CAPA, a defect
library, supplier quality, defect Pareto / repeat-failure analytics.

**Target:**
```prisma
model DefectCode { id String @id @default(cuid()) factoryId String code String label String category String? }
model QualityAlert {        // ~ quality.alert (NCR/CAPA)
  id          String @id @default(cuid())
  factoryId   String
  source      String            // INSPECTION, RECEIPT, CUSTOMER
  jobCardId   String?
  supplierId  String?
  defectCodeId String?
  severity    String @default("MINOR")
  rootCause   String?
  correctiveAction String?
  status      String @default("OPEN") // OPEN, INVESTIGATING, CLOSED
  ownerId     String?
  createdAt   DateTime @default(now())
}
```
- Link `ReworkRecord.defectCode` to `DefectCode` for Pareto.
- QC-on-receipt raises a `QualityAlert` against the supplier (feeds scorecard).
**Priority: P1.**

---

## 6. Accounting & Finance (Odoo `account`)

**Odoo reference:** everything is an `account.move` (customer invoice, vendor
bill, credit note, journal entry) with `account.move.line`; `account.payment`
settles them (partial/allocated); `account.tax` handles GST; aged
receivable/payable and tax reports are standard.

**Verity today:** `SalesInvoice`, `PaymentReceipt`, `PurchaseInvoice` models exist,
**no operational UI**. This is the biggest **P0** business gap.

**Target — adapt `account.move` as one document type with a `moveType`:**
```prisma
enum MoveType { CUSTOMER_INVOICE VENDOR_BILL CREDIT_NOTE }
model AccountMove {
  id         String @id @default(cuid())
  factoryId  String
  moveType   MoveType
  number     String @unique
  partyId    String            // customerId or supplierId
  salesOrderId String?
  purchaseOrderId String?
  status     String @default("DRAFT") // DRAFT, POSTED, PAID, PARTIAL, CANCELLED
  invoiceDate DateTime @default(now())
  dueDate    DateTime?
  subtotal   Float @default(0)
  taxAmount  Float @default(0)
  total      Float @default(0)
  gstBreakup Json?             // { cgst, sgst, igst }
  pdfUrl     String?
  lines      AccountMoveLine[]
  payments   PaymentAllocation[]
}
model AccountMoveLine { id String @id @default(cuid()) moveId String description String productVariantId String? quantity Float unitPrice Float taxRate Float @default(0) lineTotal Float }
model Payment {           // ~ account.payment
  id String @id @default(cuid()) factoryId String partyId String direction String /* IN | OUT */ amount Float mode String reference String? date DateTime @default(now()) allocations PaymentAllocation[]
}
model PaymentAllocation { id String @id @default(cuid()) paymentId String moveId String amount Float }
```
(Keep the legacy `SalesInvoice`/`PaymentReceipt` during transition, then
migrate.) `Customer.outstandingBalance` is maintained on post/pay.

**UI (`/owner/finance`):**
- **Invoices** — generate from dispatched SalesOrders (GST breakup), post, PDF,
  email; credit notes.
- **Receivables** — aging buckets (0–30/31–60/60+), per-customer statements,
  reminders (WhatsApp/email), **credit-limit enforcement** on new B2B orders.
- **Payables** — vendor bills from receipts, payments.
- **Exports** — CSV/PDF for the accountant (Tally/GST-ready columns).
**Priority: P0.**

---

## 7. Workforce & Payroll (Odoo `hr`, `hr_attendance`, `hr_payroll`)

**Odoo reference:** `hr.employee` (+ `hr.contract` with wage), `hr.attendance`
(check in/out), `hr.leave` (time off with approval), `hr.payslip` computed from
worked days/attendance and salary rules.

**Verity today:** `EmployeeProfile`, `Shift`, `AttendanceLog`, `LeaveApplication`
exist; **no operational loop**.

**Target:**
- **Attendance**: clock in/out from the worker portal (+ optional selfie / kiosk
  QR), late vs `Shift.gracePeriodMins`, owner attendance grid.
- **Leave**: worker applies → supervisor/owner approves → feeds attendance.
- **Payroll**: two engines — **piece-rate** (pay per completed job card/unit;
  Verity already tracks `completedQty` per worker — a genuine differentiator for
  garment/seat-cover factories) and **hourly/monthly** (from attendance).
  `Payslip` model per period → statement + export.
**Priority: P1/P2** (attendance/leave P1; payroll P2).

---

## 8. Analytics (Odoo dashboards / `spreadsheet_dashboard`)

Single `/owner/analytics`, server-computed with Prisma `groupBy` + short-TTL
cache (the existing perf pattern), CSV/PDF export via the reports pack.

Panels (benchmark-aligned): production **throughput** & cycle time (from
`JobCard.startedAt/completedAt`), **WIP aging**, **bottleneck** (queue depth per
department/work center), **OEE-lite** (availability from downtime × performance
vs capacity × quality pass-rate), **QC** pass/reject + **defect Pareto**,
**on-time** dispatch, **inventory** turns + valuation trend + **material
variance** (already computed), **sales** revenue/margin/win-rate, **worker
output**. **Priority: P1.**

---

## 9. Permissions & Admin (Odoo `res.groups`, `ir.rule`)

**Odoo reference:** access via **groups** (`res.groups`) + model ACLs
(`ir.model.access`) + row-level **record rules** (`ir.rule`); approvals via
`studio`/approval rules.

**Verity today:** role → permission matrix (`lib/permissions.ts`), factory can
override in settings, department-scoped visibility (workers see own,
supervisors see their department). Good foundation.

**Target (P0/P1):**
- **Admin-editable permission matrix UI** hardened (already partially there via
  `PermissionMatrixCard`) — full CRUD, per-permission per-role.
- **Record rules**: formalise "supervisor sees only their department", "worker
  sees only assigned" as a reusable scoping layer.
- **Approval rules**: amount-threshold approvals for PO/quote/credit note
  (reuse `Approval` model).
- **Destructive-action audit**: every delete/override/adjustment writes an
  `AuditLog` (mostly done) + an admin **audit review** screen.
- **Maintenance-endpoint policy**: keep `requireMaintenanceToken` on all
  seed/reseed/delete endpoints; add rate-limit + audit; block in production
  unless explicitly enabled.

---

## 10. Portals & Integrations (Odoo `portal`, `website_sale`, connectors)

**P2** — after the internal ERP is solid:
- **Dealer/B2B portal**: order history, reorder, statements/aging, quote
  requests, passport downloads (phone-OTP, reuse `/verify` infra).
- **Customer/B2C portal**: order tracking timeline + passport + reorder.
- **Product catalogue** with pricing tiers, media, documents, vehicle fitment,
  quote request (Odoo `website_sale` analogue).
- **Integrations**: WhatsApp Business + email (Resend) notification adapter
  (order-ready, QC-reject, payment reminder, dispatch), accounting export
  (Tally/GST), courier tracking APIs, payment gateway, barcode hardware.

---

## 11. Cross-cutting engineering (benchmark P0)

- **Automated tests** (benchmark's #1 P0): Vitest for pure logic
  (`variant-descriptor`, `production-status`, permissions, BOM/variance math,
  payroll, tax); **Playwright smoke** for the end-to-end path *lead → quotation
  → order → plan → job cards → material issue → stage/approval → QC → FG receipt
  → dispatch → invoice → payment* across owner/worker/supervisor/public.
- **Deterministic seed** for tests (the trial seed is a good base).
- **Migration runbook** + staging/prod rollout; retire `WorkflowStage` +
  `JobCard.stageId` once nothing reads them (cleanup migration already planned).
- **Fix the 11 lint warnings**; keep typecheck/lint green in CI.
- **Backups**: document Supabase PITR + a periodic logical dump.

---

## 12. Phased roadmap (maps benchmark P0→P2)

**Phase 1 — Operational safety & test harness (P0)**
Playwright smoke of the critical path, Vitest for logic, deterministic seed,
maintenance-endpoint policy + audit, fix lint.

**Phase 2 — CRM & quotation (P0)**
CRM schema (Lead/Account/Contact/Activity/Quotation/PriceList), `/owner/crm`,
quote → order, B2C walk-in fast path.

**Phase 3 — Finance/accounting-lite (P0)**
`AccountMove`/`Payment`, `/owner/finance` (invoices+GST, receivables aging,
payables, credit notes, exports), credit-limit enforcement.

**Phase 4 — Inventory & warehouse execution (P0/P1)**
Item/bin QR barcode flows, batch/lot issue + remaining views, QC hold/rejected
statuses (partly present), cycle counts + adjustment approval, valuation layers.

**Phase 5 — Planning, quality-plus, analytics, workforce (P1)**
Work centers/capacity + WIP aging + downtime/scrap, quality alerts/NCR-CAPA +
defect Pareto, `/owner/analytics`, attendance/shift/leave + piece-rate payroll.

**Phase 6 — Portals & integrations (P2)**
Dealer + customer portals, catalogue, WhatsApp/email/courier/payment/accounting
connectors, multi-factory if required.

Each phase ships independently to `updates`, reuses existing patterns (server
actions with `getOwnerUser`/permission gates, `revalidatePath`, live-bus,
design system, factory-scoped numbering), and adds permissions
(`ACCESS_CRM`, `ACCESS_FINANCE`, `VIEW_ANALYTICS`, `MANAGE_WORKFORCE`,
`MANAGE_QUALITY`) to the matrix.

---

## 13. Positioning (from the benchmark)

Do not sell Verity as an Odoo replacement yet. It is a **domain-specific factory
execution platform** with class-leading QC/passport/floor UX. The shortest path
to real-world ERP credibility is not more screens — it is a **tested
order-to-cash and procure-to-produce cycle** with traceability, finance,
permissions, and support proven end to end. Phases 1–3 deliver exactly that.

## 14. First build

**Phase 1 + Phase 2, steps 1–2**: the Playwright/Vitest harness on the current
critical path, then CRM schema + `/owner/crm` (Leads, Customers, Customer 360).
This closes the top benchmark P0s (tests + CRM) and unlocks finance and sales
analytics.
