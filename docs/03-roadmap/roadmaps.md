# Development & Product Roadmaps

This roadmap registers the completed work history and immediate development priorities for the Verity Operating System.

---

## 1. Accomplished Phases

### Phase 1: Composable Platform Base
*   Implemented static module registration in `registry.ts`.
*   Removed the dynamic developer SDK and packaging overhead.
*   Enforced database isolation constraints to keep tenant data strictly segregated.

### Phase 2: Decoupled Workflow Bus
*   Implemented the Prisma event listener bus in `bus.ts` and `reactions.ts`.
*   Wired up composition chains so that core modules (Booking, CRM, Billing) communicate asynchronously.
*   Added comprehensive test coverage in `reactions.test.ts`.

### Phase 3: Global Glassmorphic UI
*   Refactored the landing page login keypad and console layouts.
*   Applied translucent white and charcoal `.verity-glass` styles globally across layout components.
*   Checked and passed relative luminance and border contrast audits.

---

## 2. Immediate Priorities: Cleansing & Core Furnishing

Our primary objective is to make Verity a pristine core shell, and then build/add business capabilities module-by-module.

### Task 1: Manufacturing Purge — **done**
*   Deleted the Veda MES code, `src/lib/spec/`, and 24 database tables. The `manufacturing` and `automotive` modules and the `auto_components` pack went with them.
*   `ItemMaster` was renamed to `Product` rather than dropped: inventory, purchasing and sales run on those rows. Only the spec and BOM attachments went.
*   `item-units.ts` and `ItemFieldDefinition` were named in the purge list and kept: units and owner-defined catalogue columns are not MES.
*   The migration is `prisma/migrations/20260820000000_purge_veda_legacy`. Apply with `npx prisma migrate deploy`.

### Task 2: Dynamic Sidebar Navigation — **done**
*   `resolveNavGroups()` derives groups from the items the active modules contribute. `NAV_GROUP_ORDER` is now an ordering preference, not a whitelist — an unlisted group renders after the listed ones instead of vanishing.

### Task 3: B2C Customer Portal Rollout
*   **Action:** Build the mobile-first customer portals under `/book` (service booking calendar and slot selector) and `/menu` (food/retail visual menus).
*   **Result:** Delivering the first version of the Customer World.

---

## 3. Future Module Expansions

Once the core is fully cleansed and the Customer portal is operational, we will roll out the remaining business modules client-by-client:
1.  **QSR Cafe Operations:** A table-less cafe POS checkout screen, worker KDS order bump screens, and menu catalog adjustments. (The first attempt at these — the `menu`, `tables_orders`, `kitchen` and `serving` modules — was withdrawn as unsold; rebuild behind a customer.)
2.  **Salon & Clinic Services:** Staff appointment calendar rosters, walk-in check-in queue dashboards, and retail CRM profile tags.
3.  **Facility Management:** Site cleaner checklists, site ticket logs, and asset ledger trackers.
