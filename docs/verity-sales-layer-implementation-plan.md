# Verity Sales Layer — Implementation Plan (6 items)

Scope-bound to the **Factory Operating System** philosophy: every addition below
exists only to feed the production flow *Customer/Dealer → Quotation (optional)
→ Sales Order → Production → Dispatch → Payment*. No CRM, no portals, no
ecommerce, no accounting. See `docs/custom-fields-implementation-plan.md` for the
custom-fields system these screens should reuse rather than duplicate.

Sequencing rationale: each phase is independently shippable and ordered by
leverage-per-effort. 1–2 are near-free and unblock "dealers"; 3 is the only new
data model of real weight; 4 removes accounting drift; 5 adds the one missing
workflow step; 6 is cleanup that 1–5 make safe.

---

## Phase 1 — Order Types + Customer Tags (½ day)

**Goal:** "dealers = a customer type" and Retail/Dealer/OEM/Internal, with **no
new module** — just two enum-ish fields threaded through the existing order flow.

**Schema**
```prisma
enum OrderType { RETAIL DEALER OEM INTERNAL }

model SalesOrder {
  // ...
  orderType OrderType @default(RETAIL)
}
model Customer {
  // ...
  tags String[]        // ["Dealer"], ["OEM"] — free but UI offers the 4
  assignedSalesperson String?   // dealer field from the spec; plain text/user id
}
```
`prisma db push` — additive, nullable/defaulted, safe on live data.

**Server** — `createOrder` / `updateOrder` accept `orderType`; default RETAIL.
When a customer is tagged `Dealer`/`OEM`, pre-select the matching order type in
the studio (convenience only, still overridable).

**UI**
- Production/Order-Taking studio: a 4-way `orderType` segmented control (reuse
  the existing `Button` segmented pattern) near the customer field.
- Order lists + review dossier: show an order-type badge.
- Customer editor (Phase 2): tag multiselect with the 4 canonical tags.

**Effort:** schema + 2 action params + 3 UI touch-points. No migration risk.

---

## Phase 2 — Customer Master (fields + dedicated screen) (1 day)

**Goal:** a real customer master. Today customers are created *inline* during
order entry and there is no `/owner/customers` screen at all.

**Schema** (extend `Customer`)
```prisma
model Customer {
  customerCode    String?   // auto: CUST-0001, unique per factory
  // name, companyName, phone, email, gstNumber already exist
  altPhone        String?   // "mobile numbers" (primary + one alt; keep it simple)
  billingAddress  String?
  shippingAddress String?
  notes           String?
  // tags[], assignedSalesperson, creditLimit, paymentTerms already covered
  customFields    Json?     @default("{}")   // reuse the custom-fields system
  @@unique([factoryId, customerCode])
}
```

**Server** — `src/server/actions/customers.ts`:
- `listCustomers(search?, tag?)`, `getCustomer(id)` (with orders + derived
  timeline + vehicles), `createCustomer`, `updateCustomer`, `archiveCustomer`.
- `nextCustomerCode(factoryId)` mirroring the item-code generator in
  `scripts/enrich_seed.ts` (prefix + zero-padded max+1).
- Owner/manager/store-manager gated; every query filters `factoryId`.

**UI** — new route `src/app/owner/customers/`:
- `page.tsx` list: search, tag filter, code/name/company/phone columns, order
  count, an order-type/tag badge.
- `[id]/` detail: profile card, **Customer Timeline** (Phase 5 wiring), owned
  **Vehicles** (Phase 3), order history, attached **Documents** (Phase 6).
- Native dialog editor (reuse `dialog-service` + `CustomFieldsEditor`).
- Add nav item **Customers** to `owner-shell.tsx` (permission `CREATE_ORDER`),
  between Order Taking and Production.
- The studio's inline "new customer" keeps working but now writes the fuller
  record and links to the master.

**Effort:** the master screen is the bulk; fields are additive.

---

## Phase 3 — Customer-Owned Vehicles (1–1.5 days)

**Goal:** the one genuinely new model. Orders **reference** a saved vehicle
instead of retyping brand/model every time. Dovetails with the per-order
`vehicleBrandId/vehicleModelId` columns already added.

**Schema**
```prisma
model CustomerVehicle {
  id             String   @id @default(cuid())
  factoryId      String
  customerId     String
  customer       Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  vehicleBrandId String?                 // reuse the VehicleBrand/Model catalog
  vehicleModelId String?
  generation     String?
  fuelType       String?                 // Petrol/Diesel/CNG/EV
  transmission   String?                 // Manual/Automatic
  registrationNo String?
  vin            String?
  notes          String?
  createdAt      DateTime @default(now())
  @@index([factoryId]); @@index([customerId])
}
// SalesOrder gains an optional reference:
model SalesOrder { customerVehicleId String? }
```

**Server** — `customerVehicles.ts`: CRUD scoped to a customer. `createOrder`
accepts an optional `customerVehicleId`; when present it **copies** the vehicle's
brand/model/generation onto the order's own columns (so historical orders stay
correct even if the saved vehicle is later edited/deleted — the order is the
source of truth, the saved vehicle is just the picker).

**UI**
- Customer detail: "Vehicles" section — add/edit/remove, brand/model from the
  existing catalog pickers, reg-no/VIN/fuel/transmission.
- Studio: when a customer is chosen, offer **"Pick a saved vehicle"** (their
  vehicles) which fills the vehicle fields; typing a new one optionally offers
  "save to this customer".

**Effort:** new model + CRUD + two studio hooks. Vehicle catalog already exists,
so no master-data work.

---

## Phase 4 — Operational Payment Status (½–1 day)

**Goal:** order-level payment *status* (not accounting). Replace the
`SalesInvoice` + `PaymentReceipt` drift with six operational fields on the order.

**Schema** (on `SalesOrder`)
```prisma
model SalesOrder {
  orderValue      Float   @default(0)   // = totalAmount, kept explicit
  advanceReceived Float   @default(0)
  amountPaid      Float   @default(0)
  // pending is DERIVED: orderValue - amountPaid (never stored)
  paymentMethod   String?               // CASH | BANK_TRANSFER | CHEQUE | UPI
  paymentRef      String?
  invoiceNumber   String?               // free text — the number from Tally/etc.
}
```
Derive `paymentStatus` in code: `UNPAID | PARTIAL | PAID` from
`amountPaid` vs `orderValue`. **Do not** rebuild `SalesInvoice`/`PaymentReceipt`.

**Migration** — one-time script (`scripts/`) to fold any existing
`PaymentReceipt.amount` sums into `SalesOrder.amountPaid`, then the two models
are dropped in a follow-up once verified. Idempotent, additive first.

**Server** — `recordPayment(orderId, {amount, method, ref})` increments
`amountPaid`/`advanceReceived`; `createOrder` captures `advanceReceived` +
`orderValue` at entry (the spec's "Advance Payment" step).

**UI**
- Studio: "Order value" + "Advance received" + method/ref at the final step.
- Order list + review dossier: a **Payment Status** badge (UNPAID/PARTIAL/PAID)
  and a "Record payment" action.

**Scope guard:** no ledger, no GST, no P&L — just the running paid/pending on the
order, exactly as the spec allows.

---

## Phase 5 — Quotations + Customer Timeline (1 day)

**Goal:** the lightweight `Quotation → Approve → Convert to SO` step, and the
auto-derived customer timeline. Both are currently absent.

**Schema**
```prisma
enum QuotationStatus { DRAFT APPROVED CONVERTED REJECTED }

model Quotation {
  id            String          @id @default(cuid())
  factoryId     String
  quoteNumber   String          @unique        // QT-2026-0001
  customerId    String
  customerVehicleId String?
  orderType     OrderType       @default(RETAIL)
  status        QuotationStatus @default(DRAFT)
  validUntil    DateTime?
  notes         String?
  totalAmount   Float           @default(0)
  convertedOrderId String?                      // set on convert-to-SO
  createdAt     DateTime        @default(now())
  items         QuotationItem[]                 // mirror SalesOrderItem shape
}
```
No version history, no negotiation, no approval chain — a status field only.

**Server** — `quotations.ts`: `createQuotation`, `approveQuotation`,
`convertToSalesOrder(id)` (builds a `SalesOrder` via the existing `createOrder`
path, stamps `convertedOrderId`, flips status to CONVERTED). Owner/manager/store
gated.

**Customer Timeline** — **derived, not stored.** A `getCustomerTimeline(customerId)`
reader assembles the chain from records that already exist:
`Customer.createdAt → latest Quotation → SalesOrder(s) → ProductionPlan status →
Dispatch → deliveredAt`. Render as a read-only vertical timeline on the customer
detail page. No tasks/reminders/follow-ups (explicitly out of scope).

**UI**
- New route `src/app/owner/quotations/` (list + create + convert action) OR fold
  quotation creation into the studio with a "Save as quotation" toggle — prefer
  the latter to avoid a near-duplicate screen. A quotations **tab** on the
  order-taking page is the lightest option.
- Customer detail: the derived timeline component.

**Effort:** Quotation model + 3 actions + reuse studio; timeline is a pure reader.

---

## Phase 6 — Cleanups (½ day)

Safe to do last because earlier phases stop depending on the drift.

1. **Remove `DispatchLog`** — it is dead (no reads/writes anywhere in `src/`).
   Its only unique field, `expectedDelivery`, moves to
   `SalesOrder.expectedDeliveryDate` (the spec's "Expected Delivery Date", also
   used by the studio in Phase 4). Drop the model.
2. **`PurchaseOrder.expectedDate DateTime?`** — add the missing field; surface it
   in the purchase create form and receive flow.
3. **Broaden documents** — `FactoryDocument` only attaches to `blueprintVersion`.
   Generalise attachment so invoices, vehicle photos, measurement sheets, and
   design approvals can hang off a customer / order / customer-vehicle. Cleanest:
   a polymorphic `Attachment { entity, entityId, fileUrl, title, kind }` scoped
   by `factoryId`, reusing the Supabase upload plumbing already in
   `qc-video.ts` / `storage.ts`. Keep `FactoryDocument` for blueprint docs or
   migrate it into `Attachment`.
4. **Drop `SalesInvoice` + `PaymentReceipt`** once Phase 4's migration is
   verified (folded into order-level fields).

---

## Cross-cutting

- **Migrations:** every schema change is additive/nullable first via
  `prisma db push`; destructive drops (DispatchLog, SalesInvoice, PaymentReceipt)
  happen only in a final step after data is folded forward and verified.
- **Seeds:** extend `scripts/enrich_usage.ts` to populate customer codes,
  tags/order types, a couple of saved vehicles, advances/payments, one approved
  quotation, and an expected-delivery date — so the "week of use" demo shows the
  full flow. Keep it idempotent.
- **Access control:** all new actions are owner/manager (store-manager where the
  spec allows order/customer creation); every query filters `factoryId`; reuse
  the existing session guards.
- **Reuse, don't duplicate:** custom-fields system for extensibility, catalog
  pickers for vehicles, `dialog-service` for editors, existing `createOrder`
  chain for quotation conversion. New surface area should be thin.

## Effort summary

| Phase | Deliverable | Size |
|---|---|---|
| 1 | Order types + customer tags | ½ day |
| 2 | Customer master screen + fields | 1 day |
| 3 | Customer-owned vehicles | 1–1.5 days |
| 4 | Operational payment status | ½–1 day |
| 5 | Quotations + derived timeline | 1 day |
| 6 | Dispatch/PO/document cleanups + drift removal | ½ day |

**Total ≈ 4.5–5.5 focused days**, shippable phase-by-phase, each independently
useful and each strictly inside the Factory-OS scope.
