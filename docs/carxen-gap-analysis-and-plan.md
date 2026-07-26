# Carxen ERP — Gap Analysis & Delivery Plan

> Sources: **IAN BrandTech PRD** (CarXen Digital Manufacturing ERP Platform, 30 pages, v1.0) and the
> client-provided **chats.md** (Carxen ERP Inventory Module + full ERP/CRM/PLM spec).
> Compared against the current **Verity PWA** codebase as of 19 Jul 2026.

---

## 1. What the PWA already delivers

| Area | Status in Verity today |
|---|---|
| Auth | Phone + 4-digit PIN login, session cookie, roles (Owner / Co-Owner / Manager / Inspector / Worker), role-gated routes, `can()` permission checks |
| User management | Create/edit users, role + department assignment, team pages |
| Production | Create production (single + batch), SalesOrder → ProductionPlan → WorkOrder → JobCard chain, worker assignment, QC inspector assignment, photo reference upload, stock-matched "on-ordered" fulfilment |
| QC | Template builder (sections → checkpoints, Hindi/Hinglish scripts, require-image / require-remarks), digital inspections with per-checkpoint photo submissions, QC reports, public verify passport (`/verify/[id]`) |
| Master Data | Spreadsheet studio: vehicles (brand/model/generations), designs, fabrics, colors, materials + categories, products/variants, spec presets (product types + dynamic fields), suppliers, locations, QC templates; CSV import/export/sample on all sheets |
| Inventory | Item master (SKU, UOM, HSN, tax, min stock, safety stock), stock ledger, bin balances (warehouse→zone→rack→shelf→bin), BOM + spec-BOM auto material issuance, material reservations, finished-goods receipt on QC pass, 5-tab inventory screen incl. ongoing productions, dispatches (warehouse/store/customer) |
| Procurement | Suppliers, purchase orders, **vendor returns (new)** |
| Reports | Reports page (production-centric), dashboards with KPIs |
| Platform | Offline-capable PWA (Serwist), in-app notifications, audit log, Sentry, PostHog |

This is a strong core: **PRD modules 1, 2, 3 (partial), 8 (large part) and the QC/verification centrepiece already exist.**

---

## 2. Gap analysis vs the IAN PRD (module by module)

| # | PRD module | Verdict | Gaps to close |
|---|---|---|---|
| 1 | Authentication | 🟡 Partial | Forgot-password / reset-token flow; change-PIN from profile; session auto-logout policy; per-module RBAC config from admin panel (currently code-defined) |
| 2 | User Management | 🟡 Partial | Enable/disable accounts; last-login visibility; admin-side password/PIN reset; configurable permission matrix per role/department |
| 3 | Manufacturing orders | 🟡 Partial | PRD wants **explicit Cutting → Binding → Verification → Dispatch department stages**, each with start/hold/complete/rework states, before+after images per stage, and stage-scoped operator views. Verity has a generic JobCard + one QC step. Need: multi-stage routing (department queues), per-stage image uploads, QC-rejection → return-to-department rework loop, admin override with mandatory remarks |
| 4 | Production timeline / audit trail | 🟡 Partial | Audit log exists, but PRD wants a **per-order chronological timeline UI** (employee, time, images, remarks, stage result, overrides highlighted) on the order detail page |
| 5 | CRM | 🔴 Missing | Leads, sources, assignment, follow-up tasks/reminders, sales pipeline stages, quotations (create/revise/PDF), quote→order conversion, payment status tracking. Customers exist only as a name/phone record today |
| 6 | Dealer portal (B2B) | 🔴 Missing | Dealer login role, dealer dashboard, order placement, production milestone tracking (publish-controlled), quotation/invoice downloads, dispatch tracking, support tickets, warranty requests, strict data boundary (own records only) |
| 7 | Customer portal (B2C) | 🔴 Missing (phase 5 in PRD roadmap) | Registration, product browsing, vehicle selection, customization (fabric/design/thread), reference-image upload, online payment, tracking, warranty, support |
| 8 | Inventory | 🟢 Mostly done | Remaining: low-stock **alerts/notifications** (min levels exist, no alerting), purchase receipts (GRN) UI, barcode/QR support for items, reorder suggestions |
| 9 | Reports | 🟡 Partial | PRD's list: daily production, employee productivity, pending, completed, dispatch, dealer, sales, revenue, inventory, quality — with **PDF/spreadsheet export** and role-based access. Need report pack + export |
| 10 | Notifications | 🟡 Partial | In-app exists. Missing: Email, WhatsApp, SMS channels; event matrix (order created, stage complete, QC rejected, dispatch complete, payment received, low stock); per-role configuration |

Cross-cutting PRD asks not yet covered: **admin-configurable permissions**, **dispatch module data** (packaging images, courier partner, tracking number, delivery states — partially present via Dispatch model; needs packaging-proof images and courier status flow), **backup/recovery documentation**.

---

## 3. Gap analysis vs chats.md (Carxen inventory + ERP spec)

Items the chats add on top of the PRD:

**Inventory module (chats part 1)**
- 🟡 Inventory dashboard: stock summary values (total/raw/WIP/FG/reserved/QC-hold/rejected), today's activity, alert cards — data exists in the ledger, needs the dashboard view
- 🔴 Batch management (batch number, supplier, dates, remaining qty, QC status) — schema has `isBatchTracked` + `batchNumber` on ledger but no batch UI/flow
- 🟡 Inventory statuses (Available / Reserved / QC Hold / Rejected / Packed / Ready / Dispatched) — partial via reservations & dispatch; QC-hold and rejected stock buckets missing
- 🟡 Stock ledger per-item running balance view (movement history exists; needs per-item drilldown with balance column)
- 🔴 Reorder engine: reorder point + preferred supplier + lead time → automatic purchase suggestions
- 🟡 Reports: stock valuation, aging, fast/slow/dead stock, material variance
- 🟢 Rack/bin hierarchy, UOM, categories, 4-level classification — largely in place

**Full ERP spec (chats part 2)**
- 🟡 Product Master centrality: exists (products/variants/blueprints) but missing pricing tiers (MRP/dealer/distributor/cost/margin), product media gallery, product documents (spec sheets, patterns, CAD/DXF) with version control
- 🟡 Vehicle compatibility: hierarchy exists (brand→model→generation→year→variant) + fitments; missing attributes like fuel/transmission/airbag/seat-layout (dynamic spec fields can host these)
- 🟢 BOM: product BOM + design/fabric spec-BOMs with waste % — done
- 🟡 Vendor master: name only today; chats want contacts, GST/PAN, bank, materials supplied, performance scores, price history, outstanding payments
- 🟡 Purchase: PO exists; missing quotation→PO→approval→GRN→inspection→payment chain
- 🔴 Cutting / Stitching department modules with operator, machine, wastage, efficiency (same as PRD module 3 gap)
- 🔴 Packing module (scan → verify → accessories → warranty card → seal → photos)
- 🔴 Trading products (non-manufactured resale items)
- 🔴 Customer catalogue (search by vehicle/brand/year/color/material, PDF download, request quote)
- 🔴 Accounts-lite: invoices, payments, outstanding (needed by CRM + dealer portal)

---

## 4. Delivery plan

Ordered to match the PRD's own roadmap (core ERP → inventory/reports → dealer portal → customer portal) while reusing what Verity already has.

### Phase 1 — Production depth + traceability (core PRD acceptance criteria)
1. **Department stage routing**: model production route as ordered stages (Cutting → Binding/Stitching → QC → Packing → Dispatch) on top of existing JobCards; department queues for operators; start/hold/complete/rework states.
2. **Stage media + data capture**: before/after images, measurements, material used, remarks per stage; all stored against the work order.
3. **Rework loop**: QC reject returns the job to the offending stage with reason; admin override with mandatory remark, highlighted in timeline.
4. **Production timeline UI** on order detail: every event with employee, timestamp, images, status; export to PDF.
5. **Dispatch completion data**: packaging photos, courier partner, tracking number, delivery status states.

### Phase 2 — CRM + commercial documents
1. Lead management (source, interest, priority, assignee) with follow-up tasks and reminders (reuse notification system).
2. Quotations: vehicle + configuration + material + price + validity; revisions; PDF generation; convert to sales order.
3. Payment status on orders (advance/partial/paid) + simple invoice generation.
4. Customer 360 view: history of orders, quotes, follow-ups, documents.

### Phase 3 — Inventory completion
1. Low-stock + reorder alerts (in-app first, then email/WhatsApp) and purchase suggestions from reorder point/lead time/preferred supplier.
2. GRN (purchase receipt) flow that increments stock with rate → true valuation in the ledger; PO approval states.
3. Batch tracking UI for batch-enabled items; QC-hold / rejected stock buckets.
4. Inventory dashboard (stock summary, today's activity, alerts) + valuation/aging/fast-slow reports.
5. Barcode/QR labels for items and finished goods (QR passport already exists — extend to inventory).
6. Vendor master enrichment (GST/PAN, contacts, price history, performance).

### Phase 4 — Reports & notifications pack
1. Report suite: daily production, employee productivity, pending/completed, dispatch, sales, revenue, inventory, quality — each with CSV/PDF export and role gating.
2. Notification engine: event matrix (order created, stage completed, QC rejected, dispatched, payment received, low stock) with channel config; Email first, then WhatsApp Business API, SMS last.

### Phase 5 — Dealer portal (B2B)
1. Dealer role + scoped auth (default-deny; own data only).
2. Dealer dashboard: place orders, track published production milestones, download quotations/invoices, dispatch tracking.
3. Support tickets + warranty requests with statuses and internal assignment.

### Phase 6 — Customer portal (B2C, PRD future scope)
1. Public catalogue: browse by vehicle/brand/year/color/material with product media.
2. Customization flow (fabric/design/thread + reference upload) → order + online payment.
3. Order tracking, warranty view, support requests.

### Continuous / platform
- Admin-configurable role-permission matrix; enable/disable users; forgot-PIN flow.
- Pricing tiers + product media/documents on the product master (feeds catalogue + quotations).
- Backup/recovery runbook documentation (PRD acceptance item).

### Suggested sequencing rationale
- Phase 1 closes the PRD's **core acceptance criteria** (workflow, images, permissions, timeline) with the least new surface area — it deepens flows Verity already has.
- Phase 2 unlocks the commercial documents (quotes/invoices) that both CRM **and** the dealer portal depend on — build once, reuse in Phase 5.
- Phases 3–4 are mostly additive server actions + screens over the existing inventory engine.
- Portals come last, exactly as the PRD's own roadmap orders them, and inherit auth, orders, tracking and documents from earlier phases.

---

## 5. Just-fixed items (this session)

- Production create menu now always reflects live master-data colors/fabrics/designs (master-data actions revalidate all consuming pages + studio refreshes on open; dead hardcoded car/year lists removed).
- Procurement: "Return Materials" vendor-return flow (RET-numbered order + negative stock ledger entries).
- Master Data: vehicle sheet Year column removed; model generation entered via From-year → To-year dropdowns (with "Present").
- Material add no longer crashes on duplicate SKU (auto-suffix + friendly duplicate-name error).
- QC Templates page: CSV import, export and sample download.
- Inventory → Production tab now lists all ongoing work orders (even without BOM issuances), plus issued materials below.
- Auto-reload loop: stale service worker is unregistered in dev and always network-checked in production; Master Studio remembers its active sheet in the URL (`?sheet=`), so reloads and deep links no longer reset to Vehicles.
