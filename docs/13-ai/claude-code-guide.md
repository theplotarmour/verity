# Claude Code developer Guide & Repository Context

This document is the authoritative developer context for any AI assistant (including Claude Code) working on this repository. It maps out what has been built, the modular platform rules, and the immediate next implementation tasks.

---

## 1. Ground Truth Context
Verity is a **module-driven operating platform**, not a monolithic SaaS app or a vertical-specific tool. 

It was derived from the **VEDA codebase** (an automotive MES), which means legacy manufacturing assumptions are still embedded in the database schema. We are in the middle of extracting VEDA concepts to convert them into optional modules, leaving **Verity Core** completely industry-agnostic.

---

## 2. Completed Work (Phase 1 & 2)
We have successfully implemented and verified:
1. **Strict Gating:** Every optional owner page and server action is now guarded using `guardModulePage` or `guardModuleAction`/`guardModuleWrite`. Disabling a module now successfully blocks both route rendering and direct API/Server Action execution (Scenario E).
2. **Fail-Closed Navigation:** If a tenant has unknown or empty entitlements, the sidebar resolver defaults to `"core"` instead of displaying all navigation items.
3. **Guard Tests:** Added [`entitlement-guards.test.ts`](file:///d:/Code/verity/src/platform/modules/entitlement-guards.test.ts) (which scans optional pages/actions for guards) and [`blank-tenant.test.ts`](file:///d:/Code/verity/src/platform/tenancy/blank-tenant.test.ts) (which asserts blank tenant isolation).

---

## 3. The "Real Work" Ahead (Remediation Order)

Claude Code must execute the next phases of the modular roadmap:

### Phase 3: Convert Dashboard to Module-Composed Widgets
* **Problem:** [`src/app/owner/dashboard/page.tsx`](file:///d:/Code/verity/src/app/owner/dashboard/page.tsx) uses a hardcoded `switch(resolvePackKey(factory.industry))` block to render distinct vertical dashboard components. This is not module-composed.
* **Task:**
  1. Add `dashboardWidgets` arrays to module definitions in [`registry.ts`](file:///d:/Code/verity/src/platform/modules/registry.ts).
  2. Implement a dynamic dashboard resolver that parses the tenant's entitled modules and renders their respective widget cards side-by-side (using a symmetrical grid with `items-stretch`).
  3. Support a clean empty dashboard page if only the `core` module is enabled.

### Phase 4: Create a Real Module SDK Contract
* **Problem:** Adding a module still requires modifying the central TypeScript array in `registry.ts`.
* **Task:**
  1. Create a platform SDK in `src/platform/modules/sdk.ts` exposing helpers like `createModule()`, `registerNavigation()`, `registerPermission()`, and `registerDashboardWidget()`.
  2. Migrate a pilot module (such as `helpdesk` or `projects`) to this new package-centric structure as a proof of architecture.

### Phase 5: Extract VEDA/Manufacturing from Core
* **Problem:** Core models and schemas still carry factory-centric terminology (like Job Cards, Work Orders, and QC stages).
* **Task:**
  1. Relocate manufacturing actions and components behind the optional `manufacturing` module boundary.
  2. Decouple core database relations from manufacturing-specific fields.
