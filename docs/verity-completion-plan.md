# Verity PWA — Completion Plan (Factory Core)

> Scope: everything needed to call the factory-side PWA "complete" per the IAN PRD and the
> Carxen chats — **excluding CRM, dealer portal (B2B) and customer portal (B2C)**.
> Grounded in the current codebase (SalesOrder → ProductionPlan → WorkOrder → JobCard chain,
> stock ledger + bin balances, QC template engine, Serwist PWA).

---

## Milestone 1 — Multi-stage manufacturing (the PRD's core)

**Why first:** the PRD's acceptance criteria hinge on department stages (Cutting → Binding/Stitching →
QC → Packing) with images and rework routing. Today Verity has one generic JobCard + one QC step.

1. **Production route on stages**
   - Schema: use the existing `WorkflowStage` model (already queried in `getMasterData`) as the ordered
     route; add `stageId`, plus `startedAt/heldAt/completedAt` to `JobCard`. One JobCard per stage per
     work order (sequence already exists).
   - `createOrder` (src/server/actions/orders.ts): create the full chain of stage JobCards
     (WAITING except the first = READY), not just one.
   - Seed default stages per factory: Cutting, Stitching, QC, Packing.
2. **Stage states**: READY → IN_PROGRESS → ON_HOLD → SUBMITTED → APPROVED / REWORK.
   Completing stage N unlocks stage N+1. Server actions: `startStage`, `holdStage`,
   `completeStage(images, remarks, data)`.
3. **Per-stage capture** (PRD cutting/binding requirements)
   - Before/after images (reuse `uploadStorageImage` + `createStoragePath`), measurements,
     material used, remarks. Store on a new `StageEntry` (or extend JobCard `metadata` JSON).
4. **Rework loop**
   - QC reject → choose target stage → that stage's JobCard flips to REWORK with the rejection
     reason pinned; timeline event recorded; notification to the stage operator.
   - Admin override action (`overrideStageDecision`) requiring a mandatory remark, flagged in timeline.
5. **Worker app update**: worker queue filters by assigned stage/department; stage-scoped view only
   (PRD permission principle). The existing inspection UI stays as the QC stage.

**Acceptance:** an order can travel Cutting → Stitching → QC → Packing with images at every stage,
survive a QC rejection back to Stitching, and finish with a complete history.

---

## Milestone 2 — Production timeline & audit surfacing

1. **Timeline events table** (`TimelineEventType` enum already exists in schema): write an event on
   every stage start/complete/hold, QC decision, override, material issue, dispatch, and status change —
   employee, role, timestamp, images, remarks.
2. **Order detail timeline UI**: chronological feed on `/owner/review/[id]` (and a compact version on
   ProductionCard); overrides visually highlighted; image lightbox.
3. **PDF export** of an order's timeline (reuse the QC passport/report generation path).
4. Backfill adapter: derive events for historical orders from AuditLog + inspections where possible.

---

## Milestone 3 — Inventory completion

1. **GRN / purchase receipt flow** (model `PurchaseReceipt` exists, no UI)
   - "Receive" action on a PO: per-item received qty + rate → RECEIPT ledger entries with real
     `valuationRate`/`totalValue`, bin balance increments, PO → PARTIALLY_RECEIVED/COMPLETED.
   - This makes stock valuation real (today rates are written as 0 from production flows).
2. **Low-stock alerts + reorder suggestions**
   - Nightly/on-request check: `netStock <= minStockLevel` → in-app notification to owner +
     "Reorder suggestions" card on the Purchase page (item, suggested qty to `safetyStock`,
     preferred supplier once vendor enrichment lands, one-click draft PO).
3. **Batch tracking** for `isBatchTracked` items: batch number entry on GRN, batch picker on issue,
   remaining-qty view (ledger already has `batchNumber`).
4. **QC-hold / rejected stock buckets**: rejected inspection quantities move to a QC-hold status
   instead of vanishing; release/scrap actions.
5. **Inventory dashboard tab**: stock summary values (raw/WIP/FG/reserved), today's inward/outward,
   alert cards — all computable from `StockLedgerEntry` + `MaterialReservation`.
6. **Analysis reports**: valuation, aging, fast/slow/dead stock, material variance (BOM expected vs
   issued actual per work order).
7. **Barcode/QR for inventory**: item QR labels (SKU + bin) printable from Master Data; scan-to-find
   in stock entry modal (the verify-passport QR infra already exists to reuse).

---

## Milestone 4 — Procurement & vendor depth

1. **Vendor master enrichment**: contact person, phone, GST, PAN, bank, materials supplied, payment
   terms — extend `Supplier` + a supplier detail drawer on the Purchase page.
2. **PO lifecycle**: DRAFT → SUBMITTED → APPROVED → (receipts) → COMPLETED; approval gate for
   Manager role; price history per material per supplier (from PO items).
3. **Vendor performance**: on-time % (PO date vs receipt date), quality score (GRN inspection
   results), shown on the supplier drawer.
4. Link vendor returns (RET orders, already built) into the supplier history view.

---

## Milestone 5 — Reports pack & exports

Target list (PRD module 9, minus dealer/sales-CRM reports):
- Daily production report, employee productivity (jobs completed / rework count per worker),
  pending orders, completed orders, dispatch report, inventory report, quality report
  (QC pass rate, rejection reasons, rework by stage/department).
- Each: date-range filter, CSV export (client-side Papa, already a dependency) and print-friendly
  PDF view; role-gated via existing `can()` checks.
- Owner dashboard upgrades: orders-by-stage bar (data exists once Milestone 1 lands), QC pass-rate
  trend, low-stock count.

---

## Milestone 6 — Notifications engine

1. **Event matrix** (internal only, since portals are out of scope): order created, stage completed,
   QC rejected, rework assigned, dispatch completed, low stock, PO approved/received.
2. In-app notifications already exist — route all new events through one `emitEvent()` helper.
3. **Email channel** (Resend/SMTP): per-user opt-in per event type in settings.
4. **WhatsApp** (WhatsApp Business Cloud API) for the two highest-value events: QC rejected and
   dispatch completed. SMS: skip unless the client insists (cost/benefit).

---

## Milestone 7 — Auth & user management polish

1. Forgot-PIN flow: owner-initiated reset (admin resets a user's PIN) + OTP-by-phone self-reset if an
   SMS/WhatsApp channel exists by then.
2. Change-PIN from profile (worker/inspector/owner).
3. Enable/disable user accounts (`isActive` flag, checked in `authenticateUser`).
4. Last-login timestamp shown on the Users page.
5. **Configurable permission matrix**: per-role module toggles stored in factory `settings` JSON,
   read by `can()` — an admin screen with checkboxes instead of code-only permissions.
6. Session policy: idle auto-logout for shared shop-floor devices (configurable per factory).

---

## Milestone 8 — Platform hardening & PWA polish

1. **Backup/recovery runbook** (PRD acceptance item): documented DB backup schedule + restore steps.
2. File upload validation (type/size) on storage actions; uploads always mapped to order + uploader
   + timestamp (mostly true — audit the gaps).
3. Offline queue for the worker app: capture checkpoint submissions offline and sync on reconnect
   (Serwist background sync) — the PRD's "mobile-first shop floor" promise.
4. Print styles for passports/timelines; app icon/install-prompt QA on Android.
5. Kill remaining dev utilities from production surface (`/api/reseed-catalog`, `/api/delete-productions`,
   `/api/seed-owner` should be gated or removed — they're unauthenticated destructive endpoints).
6. Fix `npm run build`'s reliance on `prisma db push` at build time → move to `prisma migrate deploy`
   with committed migrations (safer for a live DB).

---

## Suggested order & sizing

| Milestone | Size | Depends on |
|---|---|---|
| 1. Multi-stage manufacturing | L | — |
| 2. Timeline & audit UI | M | 1 |
| 3. Inventory completion | L | GRN part independent; variance needs 1 |
| 4. Procurement & vendor depth | M | 3 (GRN) |
| 5. Reports pack | M | 1–3 (data) |
| 6. Notifications engine | M | events from 1–4 |
| 7. Auth & user mgmt polish | S–M | — (parallel) |
| 8. Platform hardening | S–M | — (parallel; item 5 & 6 do early) |

Practical sequencing: **1 → 2** as one arc (production depth), **3 → 4** as the second arc
(inventory/procurement), then **5 + 6** together (they consume the new data/events), with **7 + 8**
running as parallel filler. Security items 8.5 and 8.6 are worth pulling forward — they're small and
reduce real risk on the live database.
