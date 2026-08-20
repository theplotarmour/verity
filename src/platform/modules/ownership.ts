import type { ModuleKey } from "./registry";

/**
 * Which module owns each route and each action file.
 *
 * Written down as data because a matrix in a file can be tested and a matrix in a
 * reviewer's head cannot. `guard-coverage.test.ts` reads this and fails when
 * something classified as module-owned has no guard — which is the check that turns
 * "disable the module" from an affordance into a control.
 *
 * Three non-module classifications, all deliberate:
 *
 * - `core`     — always on. A blank tenant must still reach it. Guarding it would
 *                lock somebody out of their own settings.
 * - `public`   — no session at all. The passport verification page is scanned by a
 *                customer who has never logged in; a guard there breaks the feature.
 * - `internal`  — server-to-server only, deliberately not `"use server"`, so it is
 *                not an endpoint and has no session to guard. Its callers are the
 *                guarded surface. `itemBlueprint.ts` says so in its own header, and
 *                takes a `factoryId` parameter precisely because it is not reachable
 *                from a browser.
 * - `deferred` — ownership is a real open question and the answer changes behaviour.
 *                Listed rather than guessed, so the gap is visible instead of
 *                silently resolved by whoever edited last.
 */

export type Ownership = ModuleKey | "core" | "public" | "internal" | "deferred";

/** Paths are relative to `src/app/owner/`. */
export const ROUTE_OWNERSHIP: Record<string, Ownership> = {
  // ---- core: reachable on a blank tenant ----
  "page.tsx": "core",
  "dashboard/page.tsx": "core",
  "settings/page.tsx": "core",
  "settings/integrations/page.tsx": "core",
  "team/page.tsx": "core",
  "team/[id]/page.tsx": "core",
  "users/page.tsx": "core",
  "users/new/page.tsx": "core",
  "users/[id]/page.tsx": "core",
  "system/storage/page.tsx": "core",
  /*
   * The tenant's own Verity subscription — trial state, plan, bracket — not the
   * `billing` module, which is for invoicing *their* customers. Guarding this on
   * `billing` would lock a tenant without that module out of their own billing
   * page, which is where they go to fix exactly that.
   */
  "settings/billing/page.tsx": "core",
  /*
   * Departments are the stations a route runs through, so they read as
   * manufacturing — but they are also how a restaurant groups its kitchen and a
   * facility firm groups its crews, and `Department` is on `Factory` rather than
   * on any module. Core until something proves otherwise.
   */
  "departments/page.tsx": "core",

  // ---- deferred: open decision, see VERITY_COMPLETION_PLAN.md ----
  // Is this cross-module configuration, or `inventory` data wearing a config hat?
  // Reports reads across many modules. A single page guard is the wrong shape; it
  // needs per-section gating, which is its own piece of work.

  // ---- module-owned, already guarded ----
  "assets/page.tsx": "assets",
  "assets/[id]/page.tsx": "assets",
  "billing/page.tsx": "billing",
  "billing/[id]/page.tsx": "billing",
  "customers/page.tsx": "sales",
  "helpdesk/page.tsx": "helpdesk",
  "helpdesk/[id]/page.tsx": "helpdesk",
  "inventory/page.tsx": "inventory",
  "logistics/page.tsx": "sales",
  "projects/page.tsx": "projects",
  "projects/[id]/page.tsx": "projects",
  "purchase/page.tsx": "procurement",
  "scheduling/page.tsx": "scheduling",
  "service-work-orders/page.tsx": "helpdesk",
  "service-work-orders/inspection/[id]/page.tsx": "helpdesk",
  "booking/page.tsx": "booking",
  "sites/page.tsx": "sites",
  "sites/[id]/page.tsx": "sites",

  // ---- module-owned, guarded in this pass ----
  "inventory/labels/page.tsx": "inventory",
};

/** Keys are file names in `src/server/actions/`. */
export const ACTION_OWNERSHIP: Record<string, Ownership> = {
  // ---- core platform ----
  "auth.ts": "core",
  "hq.ts": "core", // guarded by requireHqAction, which is stricter than a module
  "modules.ts": "core", // the installer itself
  "onboarding.ts": "core", // adopting a vertical pack for your own workspace
  "permissions.ts": "core",
  "notifications.ts": "core",
  "storage.ts": "core",
  "team.ts": "core",
  "user.ts": "core",
  "employee.ts": "core",
  "departments.ts": "core",
  "integrations.ts": "core",
  "billing-account.ts": "core", // the tenant's own Verity subscription, not the billing module

  // ---- public: no session, by design ----

  // ---- deferred with the routes above ----
  "masterData.ts": "deferred",
  "items.ts": "deferred",
  "itemSearch.ts": "deferred",
  "itemUnits.ts": "deferred",
  "locations.ts": "deferred",
  "orderItemResolver.ts": "deferred", // a resolver over master data, no session of its own
  "reports.ts": "deferred",

  // ---- module-owned ----
  // Not "use server" — see its header. Its callers in itemBom.ts are guarded.

  "qc-templates.ts": "quality",
  "serviceQuality.ts": "quality",

  "inventory.ts": "inventory",
  "purchase.ts": "procurement",
  "orders.ts": "sales",
  "dispatch.ts": "sales",
  "customers.ts": "crm",
  "projects.ts": "projects",
  "assets.ts": "assets",
  "helpdesk.ts": "helpdesk",
  "sites.ts": "sites",
  "scheduling.ts": "scheduling",
  "billing.ts": "billing",

  "booking.ts": "booking",
  "franchise.ts": "sites",
};

/** Classifications that require a guard. */
export function requiresGuard(ownership: Ownership): ownership is ModuleKey {
  return (
    ownership !== "core" &&
    ownership !== "public" &&
    ownership !== "internal" &&
    ownership !== "deferred"
  );
}
