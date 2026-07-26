# Verity — Implementation Status, Competitive Position & Department System Plan

*Reviewed against `docs/chats.md` (Carxen ERP + Inventory spec), `docs/06_Modular_Workflows/16_Factory_Operational_Pipeline.md` (canonical pipeline), the IAN BrandTech PRD, and the IIMCPL quotation (QT-IIMCPL-194-2026).*

---

## 1. Are we above IAN and IIMCPL?

**Yes — comfortably, on the manufacturing core.** Both competitors quote a *generic* 10–11 module ERP; Verity already ships the factory-specific depth neither describes.

### IIMCPL (₹55–65k, 20–25 days, React + Node + Android)
11 modules: Dashboard, CRM, Sales, Purchase, Inventory, Production, QC, Label & Packing, Dispatch, Reports, Settings. Production = "Cutting → Stitching → Fitting → Finishing" as flat status; QC = "Final QC Checklist Pass/Fail". Barcode "basic". No batching, no draft stage, no per-stage image evidence, no passport, no product-combination engine, no live floor.

| Capability | IIMCPL | Verity |
|---|---|---|
| Production stages | Flat status field | Job-card chain per stage (CAD→Cutting→Stitching→QC→Packing), start/hold/complete/rework |
| QC | Single pass/fail checklist | Configurable multi-section templates, per-checkpoint photo evidence, Hindi/Hinglish, verifiable passport |
| Draft + batching | ✗ | ✓ Draft stage, multi-order clubbing into ProductionBatch |
| Product combinations | ✗ | ✓ Variant-search engine, invalid-combo prevention |
| Live floor updates | Push notifications only | ✓ SSE live-refresh across all screens |
| Traceability | Basic | ✓ Per-order timeline + audit trail + passport |

### IAN BrandTech PRD
More ambitious than IIMCPL (image-based verification, dealer/customer portals, role matrix) but still a *proposal*, not built. Verity already implements its MVP core: auth/roles, production workflow with image uploads, QC, dispatch, inventory, reports, notifications. **Where IAN is ahead on paper:** dealer portal (B2B) and customer portal (B2C) — both explicitly out of scope for Verity per prior direction.

**Verdict:** On the shop-floor operating system (production, QC, inventory, traceability) Verity is materially ahead of both. The only genuine gaps versus their *scope* are CRM depth and the external portals — deliberately deferred.

---

## 2. chats.md (Carxen ERP + Inventory) — implementation status

### Inventory module
| Requirement | Status |
|---|---|
| 4-level classification (Raw→Semi→WIP→Finished) | 🟡 Raw + WIP (reservations) + Finished; **Semi-finished** level not modelled |
| Warehouse→Zone→Rack→Shelf→Bin | ✓ Full hierarchy in schema; raw fixed to "Factory" per your latest direction |
| Stock ledger (every movement) | ✓ `StockLedgerEntry` on all movements |
| Inventory statuses (Available/Reserved/QC-Hold/Rejected/…) | 🟡 Available/Reserved/Issued/Dispatched; QC-Hold/Rejected buckets exist in schema but the UI control was removed |
| Batch management | 🟡 `batchNumber` on ledger + FIFO issue; dedicated batch master UI trimmed |
| Reorder system (min/max/reorder/safety/preferred supplier) | 🟡 min/safety + low-stock alerts + suggestions; reorder-point auto-PO partial |
| Stock movement types (all inward/outward) | ✓ Receipt, issue, transfer, adjust, vendor-return, dispatch |
| Dashboard KPIs (stock summary, today's activity, alerts) | ✓ Overview tab (values, today in/out, low-stock, valuation, variance) |
| GRN / purchase receipt | ✓ `confirmPurchaseDelivery` receives PO into stock |
| Reports (valuation, aging, fast/slow/dead, variance) | 🟡 Valuation + variance shipped; aging/dead-stock pending |
| Barcode/QR | ✓ Shelf-label QR + scan-to-find |

### Full ERP spec
| Module | Status |
|---|---|
| Product Master / Variants / Vehicle compatibility | ✓ Master Data Studio + combination engine |
| BOM (per design/fabric, scrap %) | ✓ Spec-BOM per design/fabric, waste %, merged at production start |
| Production planning + Cutting/Stitching modules | ✓ Stage engine (adds CAD, QC, Packing) |
| Quality Control (scan→sheet→photos→pass/fail→sticker) | ✓ Full digital QC + passport |
| Packing | 🟡 Packing is a stage; scan/accessory/warranty-card checklist not itemised |
| Dispatch | ✓ Warehouse/store/customer, courier, tracking |
| Vendor master (GST/PAN/bank/performance) | ✓ Supplier detail drawer + performance |
| Purchase (quotation→PO→approval→GRN→payment) | 🟡 PO→approval→GRN done; quotation + vendor payment pending |
| Trading products | ✗ Not modelled |
| CRM (lead→quote→order→after-sales) | ✗ Deferred |
| Customer catalogue / dealer portal | ✗ Deferred (B2B/B2C) |
| Reports & Dashboard | ✓ Reports pack + owner dashboard |
| User roles | ✓ Owner/Co-Owner/Manager/Inspector/Worker + Supervisor/Office-Staff enums |

---

## 3. Factory Operational Pipeline doc — implementation status

The canonical pipeline (16_…) is **largely implemented**:

| Pipeline element | Status |
|---|---|
| Three pillars (task / context / auto-transition) | ✓ role queues, passport context, auto-routing on complete |
| Draft production stage (hidden from floor, editable, releasable) | ✓ orders start DRAFT; hidden from worker/floor/WIP; released explicitly |
| Batch consolidation (Batch ID over many Order IDs, mixed stock+order) | ✓ `ProductionBatch` groups drafts; passports stay independent |
| Product combination system + intelligent autocomplete | ✓ Variant-search, all 4 creation types |
| Passport (single doc, accumulates, closes on dispatch) | ✓ QualityReport + timeline + verify page |
| Inventory lifecycle (raw→reserved→issued→consumed→FG→dispatch) | ✓ ledger-tracked |
| QC lifecycle (pass→packing / fail→rework→re-QC) | ✓ rework routes to any earlier stage |
| **Full 6-role hierarchy** (Owner, Factory Mgr, Inventory Mgr, Production Mgr, **Dept Supervisor**, Worker, QC) | 🟡 roles exist; **department-supervisor workspace is the main gap** — see §4 |
| Standard department order Cutting→Embroidery→Foam→Stitching→QC→Packing | 🟡 default route is CAD→Cutting→Stitching→QC→Packing; Embroidery/Foam not seeded |
| Per-department supervisor assigns worker → worker accepts → completes → supervisor review → next dept | 🟡 workers self-serve from queue; **no supervisor "assign / review before handoff" gate** |

**Gap summary:** the *pipeline mechanics* are done. What's missing is the **department-supervisor layer** — a distinct role workspace that assigns work within a department and reviews it before it advances.

---

## 4. Department System — Implementation Plan

### What already exists
- `ProductionTeam` model (crews per department), `teams.ts` actions (create/update/assign/plan), Teams admin page, and **team assignment on the floor** (`assignJobCardToTeam`).
- `Department` model + `WorkflowStage` (the ordered route). Job cards already carry `stageId` + `departmentId`.
- `SUPERVISOR` and `OFFICE_STAFF` roles in the enum (unused today).

### What to build (phased)

**Phase A — Departments as first-class master data**
1. Master Data → **Departments sheet**: name, sort order, `requirePhoto`/`requireRemarks`, `isQcStage`, `assignedRole`, optional QC template — editable (today the route is seeded in code via `DEFAULT_STAGES`). Let owners add Embroidery/Foam/Fitting to match their real line.
2. Seed the fuller Carxen order (Cutting→Embroidery→Foam→Stitching→QC→Packing) as the default while keeping existing factories' routes intact.

**Phase B — Supervisor role + workspace**
1. Assign each `WorkflowStage`/department a supervisor (reuse `assignedRole` + a `supervisorId`).
2. New `/supervisor` workspace (mirrors worker shell): shows only *their* department's queue with three columns — **Unassigned → In-Progress → Awaiting Review**.
3. Actions: assign a queued card to a worker/team, and **review** a worker-completed card (Approve → advance to next department, or Return → back to the worker with a reason). This inserts the missing "supervisor review before handoff" gate from the pipeline doc.
4. Permission: supervisors act only within their department; managers/owner retain cross-department override.

**Phase C — Worker ⇄ supervisor handoff**
1. Worker "Complete" on a non-QC stage moves the card to `AWAITING_REVIEW` (new sub-state) instead of auto-unblocking the next stage.
2. Supervisor approval is what unblocks the next department (auto-transition preserved, but now gated).
3. Fall back to auto-advance when a department has no supervisor assigned (keeps small factories frictionless).

**Phase D — Department analytics**
- Per-department throughput, WIP age, rework rate, and worker/team productivity (data already flows through stage entries + timeline; surface it on the Teams/Reports pages).

### Effort & sequencing
- **A** is small (extends the existing sheet + seed). **B** is the bulk (new role + workspace, ~1 new page + guard). **C** is a focused state-machine change in `stages.ts` + `inspector.ts`. **D** is reporting on existing data.
- Recommend A→B→C together as one "Department Supervisors" milestone, D as a fast follow.

---

## 5. Bottom line
- **Competitively:** ahead of IIMCPL and IAN on the manufacturing OS; behind only on deliberately-deferred CRM/portals.
- **Pipeline doc:** ~90% implemented; the department-supervisor workspace is the one structural piece left.
- **Inventory/chats:** core done; remaining items are semi-finished level, QC-hold UI, aging/dead-stock reports, quotation→payment on purchase, and trading products.
