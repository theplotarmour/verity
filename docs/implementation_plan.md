# Implementation Plan — Complete Launch Ready State

This plan outlines the concrete engineering tasks, file changes, and verification checkpoints required to advance Verity from a prototype foundation to a production-grade, launch-ready composable platform.

---

## 1. User Review Required

Before beginning execution, please review these key architecture decisions:
*   **Whitelabel Path Routing:** Dynamic consumer-facing URLs will resolve via dynamic path segment routing `/c/[clientSlug]/` (e.g. `/c/caffea/book`) rather than subdomain DNS middleware.
*   **PAISE Currency Standard:** All pricing fields (product list, booking prices) will strictly use integer paise (cents) to maintain clean invoicing arithmetic.
*   **Static Entitlement Resolver:** A strict dynamic module check will prevent a tenant from activating a module whose dependencies are not met.

---

## 2. Proposed Changes

### Phase A: Composable Platform Alpha — **built**

All five items below are implemented. Three needed a decision the plan could
not have anticipated, because the MES purge and the restaurant-pack withdrawal
landed between the plan being written and it being executed:

*   **The menu portal posts to `ingestExternalOrder`, not to a table order.**
    `tables_orders` was withdrawn. That path is the platform's existing way for
    an order to arrive from outside — a DRAFT `SalesOrder` plus the
    `ORDER_RECEIVED` webhook in one transaction — which is what "emits
    `order.received`" meant.
*   **My Day shows assigned service visits, not a KDS queue.** The `kitchen`
    module was withdrawn with the restaurant pack.
*   **`catalog` is in no pack.** Adding it to the QSR and retail bundles pushed
    both past the published 20–25% pack discount band. Repricing two live packs
    is a commercial decision, so it is enabled per tenant from the HQ builder,
    exactly like `booking`.

Two schema additions were needed: `Product.pricePaise` and
`Product.isPublished`. Products carried a valuation method and a tax rate but
no sale price, because nothing customer-facing read the table until now.
Migration: `prisma/migrations/20260820010000_catalog_portal_fields`.

#### [NEW] [catalog definition](file:///D:/Code/verity/src/platform/modules/definitions/catalog.ts)
Registers the `catalog` module in the static registry:
*   Contributes navigation paths (`/owner/catalog` for product lists) and permissions (`catalog.manage`).

#### [NEW] [whitelabel layout](file:///D:/Code/verity/src/app/c/[clientSlug]/layout.tsx)
Builds the dynamic theme layout container for B2C portals:
*   Looks up the database `Factory` context matching the `clientSlug`.
*   Injects the custom logo and brand styling colors (`--brand`, `--brand-contrast`) dynamically.

#### [NEW] [booking portal pages](file:///D:/Code/verity/src/app/c/[clientSlug]/book/page.tsx)
Implements the multi-step scheduling flow:
*   *Services List:* Queries `Product` where `itemType = SERVICE`.
*   *Staff Picker:* Lists active employees.
*   *Dynamic Time Grid:* Resolves employee shifts minus existing appointments, applying configurable slot duration and time buffers.
*   *Confirm Form:* Creates the `Appointment` record and triggers `appointment.confirmed`.

#### [NEW] [menu portal pages](file:///D:/Code/verity/src/app/c/[clientSlug]/menu/page.tsx)
Implements the digital catalog menu:
*   *Category Carousel:* Horizontal swipe categories.
*   *Product Card Grid:* Translucent `.verity-glass` grids.
*   *Cart & Table Checkout:* Simple local cart that posts items to the active table order and emits `order.received`.

#### [MODIFY] [worker dashboard](file:///D:/Code/verity/src/app/worker/page.tsx)
Refactors the worker shell into a touch-optimized mobile experience:
*   Hides all analytics, sidebar panels, and settings.
*   Renders a clear "My Day" view displaying current shift details, checklist tasks, and order bump queues (KDS).

---

### Phase B: Operational Integrity & Pilot Tuning

#### [MODIFY] [module resolver](file:///D:/Code/verity/src/platform/modules/registry.ts)
Adds a strict **dependency validation resolver**:
*   Throws a validation error during organization onboarding or HQ configuration changes if a tenant attempts to activate a module without its required dependencies.

#### [NEW] [offline indicators](file:///D:/Code/verity/src/components/ui/OfflineIndicator.tsx)
Adds resilience to floor worker environments:
*   A clean status banner in employee and customer screens that indicates connection loss and queues failed writes locally.

#### [NEW] [database indexes](file:///D:/Code/verity/prisma/schema.prisma)
Add indexing to prevent queries from slowing down under load:
*   `@@index([factoryId, startTime])` on the `Appointment` model.
*   `@@index([factoryId, date])` on the `Shift` model.

---

### Phase C: Verity 1.0 (Public Launch)

#### [MODIFY] [HQ builder](file:///D:/Code/verity/src/app/verity/clients/[id]/ClientDetailClient.tsx)
Implements the full system previewer:
*   Provides a checkbox tree for enabling/disabling packs.
*   Resolves and highlights dependencies automatically.
*   Displays a list of the exact paths and navigation groups that will be illuminated for the client.

#### [NEW] [stripe webhooks](file:///D:/Code/verity/src/app/api/billing/stripe/route.ts)
Integrates payment flows:
*   Tracks billing status, marks tenant accounts as `FROZEN` on non-payment, and updates subscription tables.

---

## 3. Verification Plan

### Composable System Tests
We will add four automated composable platform integration tests in `src/platform/tenancy/composition.test.ts`:
1.  **Blank Check:** Provision tenant with zero modules $\rightarrow$ verify only `core` dashboard and empty nav is rendered.
2.  **Service Business Check:** Activate `core` + `booking` + `billing` $\rightarrow$ verify `/book` portal is accessible and staff calendars render.
3.  **Commerce Business Check:** Activate `core` + `inventory` + `catalog` + `sales` $\rightarrow$ verify `/menu` portal is live and sales order CRUD compiles.

### Usability Verification Checks
1.  **Mobile Auditor:** Audit `/worker` and B2C portals on a simulated iPhone/Android frame to check click target sizes and viewport bounds.
2.  **Latency Gate:** Run audit script to verify slot calculations render in $<200\text{ms}$.
