# Verity — Status Update (20 Jul 2026)

> Re-assessment against the IAN PRD + Carxen chats and the original 8-milestone
> completion plan, now that milestones M1–M8 plus follow-on features G1–G4 have
> landed on `master`. Scope remains **factory core — CRM, dealer portal (B2B),
> customer portal (B2C) excluded**, per the original scoping decision.

---

## 1. What's done (verified in code, not just planned)

| Milestone | Status | Evidence |
|---|---|---|
| M1 — Multi-stage manufacturing | ✅ Done | Stage-routed JobCards (Cutting→Stitching→QC→Packing), per-stage photo/measurement capture, QC rework routing to any earlier stage, admin override with mandatory remark |
| M2 — Production timeline & audit UI | ✅ Done | `getProductionTimeline` + `OrderTimeline` component on batch oversight, print/PDF export, stage-aware Floor terminals |
| M3 — Inventory completion | ✅ Done | GRN (purchase receipt → raw stock with real valuation), low-stock alerts + reorder suggestions, stock valuation, material variance (BOM expected vs issued) |
| M4 — Procurement & vendor depth | ✅ Done | Supplier profiles (GST/PAN/contacts/bank), price history, PO approval lifecycle, vendor returns |
| M5 — Reports pack | ✅ Done | Production, employee, orders, dispatch, quality, inventory reports + CSV export |
| M6 — Notifications engine | ✅ Done | `emitEvent` funnel: in-app always-on, Email (Resend) and WhatsApp (Business Cloud API) per-user opt-in, event matrix covering order/stage/QC/dispatch/PO/low-stock |
| M7 — Auth & user management polish | ✅ Done | Self-service PIN change, admin-initiated PIN reset, enable/disable accounts, idle auto-logout |
| M8 — Platform hardening (partial) | 🟡 Mostly done | `docs/backup-recovery.md` written; reload-loop fixed (this session); dev-only seed/reseed endpoints still need an auth gate (see §3) |
| G1 — Universal product combination system | ✅ Done | Brand→Model→Generation→Category→Product cascading selection |
| G2 — Design reference images | ✅ Done | Reference images visible to operators during stage work |
| G3 — Manual inventory adjustment + audit trail | ✅ Done | `adjustStock` with mandatory remark, `adjustmentType`, logged to the stock ledger |
| G4 — Passport evidence lightbox | ✅ Done | Full-size QC evidence viewing on the public verify passport |

**This session also fixed:**
- The persistent reload loop (a blind 15s `router.refresh()` interval, replaced with focus-triggered refresh + push-based SSE live updates) and the "can't open Create Production studio" regression it caused.
- Inventory restructure: separate Receive/Issue/Transfer/Adjust action buttons (was one combined "Stock Entry" modal), Adjustments tab removed (action stays via header button, history still in the Raw tab's ledger), Dispatch renamed and reordered right after Production, Warehouses/Stores rebuilt as location card grids with a full-detail drawer per location.
- Supplier deletion no longer crashes with a raw FK error when purchase orders reference it.

---

## 2. What's left from the PRD + chats (factory-core scope)

| Area | Gap | Notes |
|---|---|---|
| **Permission matrix** | Still hardcoded in `lib/permissions.ts`, not admin-editable | PRD asks for an admin screen to toggle module access per role. Currently a code change, not a UI action. |
| **Batch traceability UI** | `batchNumber` is captured on GRN receipt but there's no batch picker on issue, no remaining-qty-per-batch view | Chats' "Batch Management" section wants batch number, supplier, mfg date, remaining qty, QC status all visible together. |
| **QC-hold / rejected stock bucket** | Rejected inspection quantities don't get a distinct inventory status | Chats list `QC Hold` and `Rejected` as first-class stock states; today a QC rejection routes the *job* to rework but doesn't move *stock* into a hold bucket. |
| **Barcode/QR on inventory items** | The verify-passport QR exists for finished-goods traceability, but raw-material items have no printable SKU/bin label | PRD module 8 + chats both ask for barcode support on inventory items specifically. |
| **Dev/seed endpoints exposed** | `/api/reseed-catalog`, `/api/delete-productions`, `/api/seed-owner` are live, unauthenticated, destructive | Flagged in the original plan (M8.5), not yet closed. |
| **Multi-factory / franchise** | Not started | Explicitly a PRD *future enhancement*, not MVP — correctly deprioritized. |

Everything else in the PRD's factory-core module list (auth, manufacturing lifecycle, QC, dispatch, inventory, reports, notifications) has a working implementation. The remaining items above are all small, scoped additions — none are architectural gaps.

## 3. Explicitly out of scope (unchanged from original scoping)

CRM (leads/quotes/follow-ups), Dealer Portal (B2B), Customer Portal (B2C) — excluded by your instruction at the start of this work. See §4 of the forward roadmap if/when you want to revisit that boundary.
