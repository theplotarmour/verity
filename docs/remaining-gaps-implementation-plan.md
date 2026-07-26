# Verity — Remaining Gaps Implementation Plan

Status: **Draft for review** · Target branch: `updates`
Scope: CRM (B2B + B2C), Finance/Accounting, Analytics, Workforce, and platform
gaps. This is the plan to take Verity from "manufacturing core complete" to a
full factory operating system.

> Note: the request said "B2B and B2B" — read as **B2B and B2C**. Both are
> covered below as two flavours of the same CRM engine.

---

## 0. Where we are

The **make-to-order manufacturing spine is complete**: Purchase → Item Master →
Inventory → Departments (CAD→Cutting→Stitching→QC→Packing) → Dispatch, with
auto-inventory, BOM consumption, per-department templates, QR passports, and the
Owner/Supervisor/Worker portals.

**What's thin or missing** (this plan):
1. CRM — `Customer` is an order picker; `Deal` has no UI; no leads, contacts,
   quotations, accounts, or customer 360.
2. Finance — `SalesInvoice` / `PaymentReceipt` / `PurchaseInvoice` models exist,
   no UI; no receivables/payables, GST docs, or credit enforcement.
3. Analytics — only the dashboard + QC reports; no throughput/sales/quality
   analytics engine.
4. Workforce — `EmployeeProfile` / `Shift` / `AttendanceLog` / `LeaveApplication`
   exist, no UI; no payroll.
5. Platform — no tests, `WorkflowStage` dead-but-present, notifications are
   in-app only (no WhatsApp/email), department-aware supervisor routing pending.

---

## 1. CRM Engine (B2B + B2C)

### 1.1 The B2B vs B2C split

Verity sells two ways, and the CRM must model both without forcing one shape on the
other:

| | **B2B** (dealers, workshops, distributors) | **B2C** (retail / walk-in / direct) |
|---|---|---|
| Buyer | A **company/account** with many **contacts** | An **individual** |
| Sales motion | Lead → qualify → quote → negotiate → recurring orders | Walk-in / enquiry → order, mostly immediate |
| Payment | Credit terms, invoices, receivables aging | Pay-on-order, mostly settled |
| Pricing | Price lists / negotiated rates, bulk discounts | List price |
| Volume | Repeat bulk orders | One-off, small qty |
| Portal | Account portal (order history, reorder, statements) | Order-tracking link + passport |

**Modelling decision:** keep **one `Customer` table** but add a `type`
(`B2B` \| `B2C`) discriminator, and introduce **`Account`** + **`Contact`** for
the B2B side. A B2C customer is a `Customer` with no account and an inline
contact. This avoids a fork while giving B2B its structure.

### 1.2 Schema additions

```prisma
enum CustomerType { B2B  B2C }
enum LeadStage    { NEW  CONTACTED  QUALIFIED  QUOTED  WON  LOST }
enum ActivityType { CALL  EMAIL  WHATSAPP  MEETING  NOTE  QUOTE_SENT  ORDER_PLACED }

model Account {              // B2B company
  id            String   @id @default(cuid())
  factoryId     String
  name          String
  gstNumber     String?
  billingAddress String?
  shippingAddress String?
  creditLimit   Float    @default(0)
  paymentTerms  String?           // "NET 30", "Advance"...
  priceListId   String?
  ownerId       String?           // account manager (User)
  contacts      Contact[]
  customers     Customer[]
  deals         Deal[]
  createdAt     DateTime @default(now())
  @@index([factoryId])
}

model Contact {
  id        String   @id @default(cuid())
  factoryId String
  accountId String?
  name      String
  phone     String?
  email     String?
  role      String?            // "Purchase Manager", "Owner"
  isPrimary Boolean  @default(false)
  @@index([factoryId])
}

model Lead {
  id          String    @id @default(cuid())
  factoryId   String
  name        String
  phone       String?
  email       String?
  company     String?
  source      String?            // WALK_IN, REFERRAL, WHATSAPP, INSTAGRAM, EXHIBITION
  type        CustomerType @default(B2C)
  stage       LeadStage    @default(NEW)
  ownerId     String?
  estimatedValue Float?
  notes       String?
  convertedCustomerId String?     // set when converted
  createdAt   DateTime  @default(now())
  @@index([factoryId, stage])
}

model Quotation {
  id          String   @id @default(cuid())
  factoryId   String
  quoteNumber String   @unique
  customerId  String?
  leadId      String?
  status      String   @default("DRAFT") // DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED
  validUntil  DateTime?
  subtotal    Float    @default(0)
  taxAmount   Float    @default(0)
  total       Float    @default(0)
  notes       String?
  items       QuotationItem[]
  createdAt   DateTime @default(now())
  @@index([factoryId])
}

model QuotationItem {
  id            String   @id @default(cuid())
  quotationId   String
  description   String            // free text or productVariant snapshot
  productVariantId String?
  quantity      Float
  unitPrice     Float
  taxRate       Float    @default(0)
}

model Activity {                 // the interaction timeline (Customer 360)
  id         String   @id @default(cuid())
  factoryId  String
  type       ActivityType
  customerId String?
  leadId     String?
  accountId  String?
  subject    String
  body       String?
  actorId    String?
  createdAt  DateTime @default(now())
  @@index([factoryId, customerId])
}

model PriceList {
  id        String   @id @default(cuid())
  factoryId String
  name      String
  entries   PriceListEntry[]     // per productVariant override
}
model PriceListEntry {
  id             String @id @default(cuid())
  priceListId    String
  productVariantId String
  price          Float
}
```

**`Customer` gets:** `type CustomerType @default(B2C)`, `accountId String?`,
`ownerId String?` (account manager), `outstandingBalance Float @default(0)`
(denormalised receivable, kept in sync by finance).

**`Deal` gets** the account/contact links and a `quotationId`.

### 1.3 Server actions (`src/server/actions/crm.ts`)

- **Leads:** `createLead`, `updateLeadStage`, `assignLead`, `convertLead`
  (creates Customer [+ Account/Contact for B2B] and optionally a Deal).
- **Accounts/Contacts:** CRUD, `setPrimaryContact`.
- **Customers:** `createCustomer` (type-aware), `updateCustomer`, `getCustomer360`
  (profile + orders + quotes + invoices + activity + balance).
- **Deals:** pipeline CRUD, `moveDealStage`, `winDeal` (→ order/quote), `loseDeal`.
- **Quotations:** `createQuote`, `addQuoteItem`, `sendQuote`, `acceptQuote`
  (→ Sales Order via the existing production studio), `expireQuotes` (cron).
- **Activities:** `logActivity` (auto-logged on quote sent, order placed, payment).
- Quote/lead numbering via a shared factory-scoped sequence helper.

### 1.4 UI (`/owner/crm`)

New nav group **"Sales & CRM"**:
- **Leads** — kanban by `LeadStage`, quick-add (walk-in capture), convert.
- **Pipeline (Deals)** — kanban by deal stage, value-weighted totals.
- **Customers** — list with B2B/B2C filter; **Customer 360** drawer (orders,
  quotes, invoices, balance, activity timeline, reorder button).
- **Accounts** — B2B directory with contacts, credit, price list, statement.
- **Quotations** — builder (reuse the variant search + line-item UI from the
  production studio), PDF export, send, accept→order.

### 1.5 B2C fast path

A dedicated **"New retail order"** entry that: looks up/creates a B2C `Customer`
by phone in one field, jumps straight into the production studio, and marks
payment collected — no lead/quote ceremony. This is the walk-in counter flow.

### 1.6 Customer portal (Phase 2, deferrable)

Extend the existing public `/verify/[id]` passport into a light **account portal**
(`/portal`, phone-OTP): order status timeline, passport downloads, reorder,
outstanding statement (B2B). No new heavy auth — reuse phone + OTP.

---

## 2. Finance & Accounting

Models exist (`SalesInvoice`, `PaymentReceipt`, `PurchaseInvoice`); this is
mostly UI + wiring.

### 2.1 Schema tweaks
- `SalesInvoice`: add `items Json`, `subtotal`, `taxAmount`, `gstBreakup Json`
  (CGST/SGST/IGST), `pdfUrl`.
- New `CreditNote` (returns/adjustments).
- `PaymentReceipt`: add `salesInvoiceId?`, `allocation Json` (split across
  invoices).

### 2.2 Actions (`finance.ts`)
- `generateInvoice(salesOrderId)` — pulls order lines, applies tax, GST breakup,
  numbers it, renders PDF.
- `recordPayment` — allocate to invoices, update `Customer.outstandingBalance`.
- `enforceCreditLimit` — block/allow new B2B orders against `Account.creditLimit`.
- Payables: receive `PurchaseInvoice`, `recordSupplierPayment`.

### 2.3 UI (`/owner/finance`)
- **Receivables** — aging buckets (0–30/31–60/60+), per-customer statements,
  "send reminder" (WhatsApp/email).
- **Invoices** — generate from dispatched orders, list, PDF, mark paid.
- **Payables** — supplier bills + payments.
- **Cash view** — inflow/outflow, simple P&L (revenue − COGS from ledger −
  expenses).

### 2.4 Dependency
Ties into CRM (credit limits, statements) and Inventory (COGS from
`StockLedgerEntry`). Do **after** CRM Phase 1.

---

## 3. Analytics Engine

A single `/owner/analytics` with server-computed aggregates (no new heavy infra —
Prisma `groupBy` + cached queries, matching the existing perf patterns).

**Panels:**
- **Production throughput** — units/stage/day, WIP by department, cycle time per
  stage (from `JobCard.startedAt`/`completedAt`), bottleneck highlight.
- **Quality** — QC pass/reject rate, rework rate, defect Pareto (from
  `CheckpointSubmission` / `ReworkRecord`), per-department quality.
- **On-time** — dispatch vs promised date.
- **Inventory** — stock value trend, turns, low-stock, BOM variance (already
  computed in inventory — surface as a trend).
- **Sales** — revenue by period/customer/product, pipeline conversion, quote
  win-rate (needs CRM).
- **Workforce** — output per worker/department (needs attendance for rate).

**Approach:** `src/server/actions/analytics.ts` with one function per panel,
date-range param, `unstable_cache` with short TTL. Export to CSV/PDF reuses the
existing reports pack.

---

## 4. Workforce Engine

Models exist; build the operational loop.

### 4.1 Attendance & shifts
- **Clock in/out** from the worker portal (button + optional selfie/QR at a
  factory kiosk). Writes `AttendanceLog`, flags late vs `Shift.gracePeriodMins`.
- Owner **attendance sheet** (daily grid, present/half/absent, overtime).
- Shift CRUD in Settings.

### 4.2 Leave
- Worker applies (`LeaveApplication`); supervisor/owner approves; feeds the
  attendance sheet.

### 4.3 Payroll (Phase 2)
- Two models: **piece-rate** (pay per completed job card / unit — Verity already
  tracks `completedQty` per worker) and **hourly/monthly** (from attendance).
- `payroll.ts`: `computePayroll(period)` → per-worker statement (base + pieces +
  overtime − leave), export. This is where piece-rate manufacturing pay actually
  gets automated — a strong differentiator.

### 4.4 UI
`/owner/workforce` (or fold into Team): attendance, leave approvals, payroll runs.

---

## 5. Platform Gaps

| Gap | Plan | Priority |
|---|---|---|
| **Notifications beyond in-app** | Adapter in `notify.ts`; WhatsApp Cloud API + email (Resend). Templated: order ready, QC reject, payment reminder, dispatch. Gate behind `User.notificationPrefs` (already modelled). | High (client-facing) |
| **`WorkflowStage` cleanup** | Once nothing reads it, drop `WorkflowStage` + `JobCard.stageId` in a migration; remove the stage-fallback branches in `stages.ts`/`inspector.ts`. | Low (tech debt) |
| **Dept-aware supervisor routing** | Login routes a supervisor by their department: QC dept → `/inspector`, other dept → that department's floor view. Needed once non-QC supervisors exist. | Medium |
| **Automated tests** | Vitest for pure logic (`variant-descriptor`, `production-status`, permissions, BOM math, payroll); Playwright smoke for the order→dispatch happy path. | Medium |
| **Item-code backfill** | One-off action to assign `itemCode` to pre-existing items. Not needed for the trial (fresh data). | Low |
| **Offline sync hardening** | The PWA shell + IDB exist; formalise the stage-capture offline queue + conflict handling per docs/06_15. | Medium |
| **Audit/exports** | Extend the reports pack with CRM + finance + workforce exports. | Low |

---

## 6. Recommended sequencing

Each phase is independently shippable and pushed per-feature to `updates`.

**Phase 1 — CRM core (B2B + B2C)** ← highest business value
1. Schema: CustomerType, Account, Contact, Lead, Activity, Quotation(+items),
   PriceList; extend Customer/Deal.
2. `crm.ts` actions + `/owner/crm` (Leads kanban, Customers + 360, Accounts).
3. Quotations builder → accept → order; B2C walk-in fast path.

**Phase 2 — Finance**
4. Invoice generation (GST) from orders, receivables aging, payments, credit
   enforcement; payables.

**Phase 3 — Analytics**
5. `/owner/analytics` panels (production, quality, on-time, inventory, sales).

**Phase 4 — Workforce**
6. Attendance + shifts + leave, then piece-rate/hourly payroll.

**Phase 5 — Platform**
7. WhatsApp/email notifications, tests, dept-aware routing, WorkflowStage
   cleanup, offline hardening.

**Cross-cutting:** every new module reuses the existing patterns — server actions
with `getOwnerUser`/permission gates, `revalidatePath`, the live-bus for SSE
refresh, the Surface/PageHeader/Modal design system, and factory-scoped
numbering. New permissions (`ACCESS_CRM`, `ACCESS_FINANCE`, `VIEW_ANALYTICS`,
`MANAGE_WORKFORCE`) slot into the existing matrix.

---

## 7. Effort snapshot (rough)

| Phase | Scope | Relative size |
|---|---|---|
| 1. CRM | 8 models, ~1 action file, 4–5 pages | Large |
| 2. Finance | 2 model tweaks, 1 action file, 3 pages | Medium |
| 3. Analytics | 1 action file, 1 page (6 panels) | Medium |
| 4. Workforce | attendance loop + payroll | Medium–Large |
| 5. Platform | notifications + tests + cleanups | Medium |

Suggested first build: **Phase 1, step 1–2** (CRM schema + Leads/Customers/360).
It unlocks Finance and the Sales analytics, and it's the gap a client feels first
after the manufacturing core.
