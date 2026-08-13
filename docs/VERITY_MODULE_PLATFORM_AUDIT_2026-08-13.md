# Verity Module Platform Architecture Audit

Date: 2026-08-13

## Verdict

Verity is partially aligned with the target vision, but it is not yet a true module-driven operating platform.

The repo has real module-platform foundations: a registry, organization-scoped entitlements, dependency expansion, server-side module guards, HQ module toggles, pack definitions, entitlement-aware navigation, and a newer registry-based RBAC resolver.

The blocking issue is that these foundations do not yet own the product surface end to end. The app still behaves like a VEDA-derived vertical application with modules layered on top: fixed `/owner/*` routes, a hardcoded vertical dashboard switch, legacy factory terminology, legacy permission gates, manufacturing-specific models in the central Prisma schema, and incomplete module guard coverage.

The next phase should not be "build more modules." The next phase should be making one module fully installable, enforceable, configurable, testable, and removable for a blank tenant without changing shared shell, route, dashboard, or permission code.

## What The Vision Requires

The pasted vision requires three separate systems:

1. Module Catalog: what Verity can provide.
2. Client Configuration: what a tenant has enabled.
3. Client Data: the tenant-owned records created inside enabled modules.

It also requires this acceptance test:

Create a blank tenant. It should show an empty configured Verity workspace. Enable modules through Verity admin. The client portal, navigation, routes, permissions, APIs, dashboard, and data surfaces should change from configuration without code changes.

## Evidence Of Alignment

### 1. A central module registry exists

`src/platform/modules/registry.ts` defines module keys, dependencies, permissions, versions, navigation items, and always-on modules. This is the correct direction.

Evidence:

- `ModuleKey` includes core, horizontal modules, service modules, and restaurant modules.
- `ModuleDefinition` has `version`, `alwaysOn`, `requires`, `permissions`, `navItems`, and `vertical`.
- `withDependencies()` expands module dependencies.

This is the closest existing implementation to the desired Module Catalog.

### 2. Tenant module enablement exists

`prisma/schema.prisma` has `ModuleEntitlement` scoped to `organizationId`, with `moduleKey`, `enabled`, `expiresAt`, and `settings`.

This aligns with the requested `OrganizationModule` concept and supports "disable without deleting data."

### 3. Provisioning creates tenants with modules

`src/platform/tenancy/provision.ts` creates Organization, Factory, roles, permission grants, and module entitlements atomically.

This is directionally correct, but the default is not yet "blank client with no business modules." It uses `DEFAULT_MODULES` unless the caller overrides modules.

### 4. Admin can manage modules

`src/server/actions/hq.ts` exposes `updateTenantModules()` and `applyVerticalPack()` for internal HQ use. It persists entitlements and invalidates entitlement cache.

`src/app/verity/clients/[id]/ClientDetailClient.tsx` renders a module toggle UI and pack selector.

This is a working beginning of the Module Library / Build Client System experience.

### 5. Navigation is partly module-driven

`src/platform/modules/navigation.ts` resolves nav items from:

- tenant enabled modules,
- registry permissions,
- legacy permission checks,
- role carve-outs.

`src/app/owner/layout.tsx` passes `enabledModules` and `grantedPermissions` into `OwnerShell`.

This is aligned with the vision that the sidebar should come from configuration.

### 6. Some newer modules are server-gated

Newer service modules such as projects, assets, helpdesk, sites, scheduling, billing, dining, kitchen, serving, and menu use `guardModulePage`, `guardModuleAction`, or `guardModuleWrite`.

This is the correct security direction: frontend hiding is not treated as the only control.

## Architectural Blockers

### P0: Module enablement does not yet enforce every route and action

Several important owner pages have no `guardModulePage(...)` call:

- `src/app/owner/production/page.tsx`
- `src/app/owner/inventory/page.tsx`
- `src/app/owner/purchase/page.tsx`
- `src/app/owner/qc-floor/page.tsx`
- `src/app/owner/floor/page.tsx`
- `src/app/owner/order-taking/page.tsx`
- `src/app/owner/customers/page.tsx`
- `src/app/owner/reports/page.tsx`
- `src/app/owner/master-data/page.tsx`

I also found no `guardModuleAction` or `guardModuleWrite` calls in older action files checked:

- `src/server/actions/production.ts`
- `src/server/actions/inventory.ts`
- `src/server/actions/purchase.ts`
- `src/server/actions/qc.ts`
- `src/server/actions/customers.ts`
- `src/server/actions/masterData.ts`
- `src/server/actions/orders.ts`

Impact:

Disabling a module can remove navigation while leaving direct URLs and server actions reachable. This fails the vision's Scenario E: "Tasks disappears from UI, API also blocks access."

Required fix:

Create a module ownership map for every `/owner/*` route and every `"use server"` action. Add entitlement guards at page and action boundaries. Add tests that fail when a module-owned route/action lacks its guard.

### P0: Dashboard is still vertical-switch application code

`src/app/owner/dashboard/page.tsx` reads `factory.industry`, normalizes it with `resolvePackKey`, and switches over vertical dashboards:

- facility management
- franchise QSR
- franchise retail
- restaurant ops
- professional services
- retail OS
- auto components fallback

Impact:

This is not a module-composed dashboard. It is a vertical application switch. A blank tenant or custom module composition cannot produce a dashboard from enabled module widgets. Adding a new system still requires editing dashboard code.

Required fix:

Move dashboards to module-contributed widgets:

- module manifest declares dashboard widgets,
- tenant enabled modules select widgets,
- user permissions filter widgets,
- dashboard resolver renders available widgets,
- blank tenant renders a configured-empty state.

### P0: Core still carries VEDA/manufacturing concepts

The central schema still has `Factory` as the primary tenant workspace model and many `factoryId`-scoped tables. `Factory` has direct relations to `workflowStages`, `menuCategories`, `menuItems`, `diningTables`, `diningOrders`, and `diningBills`.

The schema and code still contain production/QC/manufacturing concepts across the core app:

- production plans, work orders, job cards,
- QC templates and inspections,
- factory departments and production stages,
- stock production / on-ordered production,
- automotive Carxen product configuration comments and UI copy.

Impact:

This keeps Verity mentally and technically anchored to VEDA/Factory OS. It may work for the first clients, but it makes the platform harder to sell as "tell us what you need" because Core still knows too much about specific industries.

Required fix:

Do not rename everything immediately. First classify schema and code into:

- Core platform,
- reusable horizontal module,
- VEDA/manufacturing module,
- restaurant module,
- technical debt.

Then move domain-owned route/action/UI/data contracts behind module manifests and module-specific service boundaries.

### P0: There is no real module package/SDK boundary

The registry is a TypeScript array in `src/platform/modules/registry.ts`. Modules do not live as standard packages with their own manifest, database ownership, services, APIs, UI, routes, permissions, navigation, workflows, events, configuration, and tests.

Impact:

Adding a module still means editing the central registry and often adding files under shared `src/app/owner`, `src/server/actions`, and `src/components`. This is better than hardcoded nav, but it is not yet an installable module contract.

Required fix:

Introduce a small internal module SDK before building many more modules:

- `createModule()`
- `registerNavigation()`
- `registerPermission()`
- `registerDashboardWidget()`
- `registerRouteGuard()`
- `registerSettings()`
- `registerWorkflow()`
- `registerEvent()`
- module test harness helpers.

Do this for one pilot module first.

### P1: Blank tenant behavior is not proven

The vision says a new tenant should start with no business modules and an empty portal.

Current provisioning defaults to `DEFAULT_MODULES` unless modules are passed. Several fallback paths also preserve legacy behavior, for example navigation treats `enabledModules === undefined` as "show everything."

Impact:

This protects backward compatibility, but it is the opposite of a strict platform guarantee. A missing entitlement resolution can accidentally expose every nav item.

Required fix:

Add an explicit "blank tenant" test fixture:

- Organization and Factory exist.
- Only `core` entitlement is enabled.
- No seeded domain data.
- Portal shows dashboard/settings/team only as intentionally core-owned surfaces.
- Every optional module URL redirects or blocks.
- Every optional module action throws.

Then remove "unknown means allow" fallbacks from production paths once call sites are migrated.

### P1: Legacy permission model is still active

`src/lib/permissions.ts` is marked deprecated and maps fixed permissions such as `CREATE_ORDER`, `QC_QUEUE`, and `WORKER_JOBS` to registry keys. `src/platform/modules/navigation.ts` still requires the legacy `can(permission)` gate.

Impact:

New modules still have to understand old VEDA-era permission names. For example, service modules use `CREATE_ORDER` as a legacy gate even when their actual registry permission is `ticket.view`, `asset.view`, or `invoice.view`.

Required fix:

Migrate remaining call sites to `resolveAccess()` / `requirePermission()` and remove the legacy permission union. Until then, module permissions are not the single source of truth.

### P1: Module lifecycle is shallow

`ModuleEntitlement` has `enabled`, `expiresAt`, and `settings`, but the registry does not model full lifecycle states:

- DRAFT
- DEVELOPMENT
- BETA
- ACTIVE
- DEPRECATED
- ARCHIVED

Nor does it model version deployments per tenant beyond a static module `version` in code.

Impact:

This is acceptable for a first internal platform pass, but it will become a blocker once clients are on different module versions or custom modules are built for one client before becoming reusable.

Required fix:

Add a future-safe split:

- Module catalog definition,
- Module version,
- Tenant module deployment,
- lifecycle status,
- origin metadata,
- ownership/reuse policy.

Do not overbuild migration tooling yet, but avoid hardcoding assumptions that every tenant is on latest.

### P1: Module dependencies are only registry-level, not data/API contract-level

`withDependencies()` correctly enables dependencies, but dependency validation does not prove that module code only reads dependency-owned data it declared.

Impact:

A module can call another module's tables/actions without declaring that dependency. The registry comment warns against this, but the repo does not yet enforce it.

Required fix:

Add static tests or conventions:

- module-owned server actions import only allowed core/module APIs,
- direct Prisma access is disallowed outside the owning module service,
- dependency graph is tested against imports.

### P2: Admin module UI is a toggle list, not yet a system builder

The HQ client detail page allows toggling modules and applying packs, which is useful. It does not yet provide:

- module marketplace status/version/client count,
- module preview,
- dependency preview in the main toggle UI,
- saved system templates,
- custom module intake,
- deployment preview.

Impact:

This is enough for early internal use, but it is not yet the "Build Client System" experience described in the vision.

Required fix:

After route/action enforcement is complete, expand HQ to:

- Module Library,
- Pack Library,
- System Templates,
- client system preview,
- module lifecycle and version metadata.

## Route And Module Ownership Snapshot

Current evidence suggests this rough classification:

Core or platform:

- `/owner/dashboard` but should become widget-composed
- `/owner/settings`
- `/owner/team`
- `/owner/departments`
- `/owner/master-data` only if treated as cross-module configuration, not product/domain data
- `/verity/*` internal HQ admin

Manufacturing / VEDA module:

- `/owner/production`
- `/owner/floor`
- `/owner/qc-floor` if production QC; general inspections should be separated
- `/owner/order-taking` if it creates production orders
- production labels, job cards, worker stage flows

Inventory / procurement / sales modules:

- `/owner/inventory`
- `/owner/purchase`
- `/owner/logistics`
- `/owner/customers` if customer management is sales/CRM rather than core

Service modules already closer to target:

- `/owner/projects`
- `/owner/assets`
- `/owner/helpdesk`
- `/owner/service-work-orders`
- `/owner/sites`
- `/owner/scheduling`
- `/owner/billing`

Restaurant modules:

- `/owner/kitchen`
- `/owner/serving`
- dining/menu/table actions and models

## Remediation Order

### Phase 1: Make disabling real

1. Create a module ownership matrix for every route and server action.
2. Add `guardModulePage` to every optional module page.
3. Add `guardModuleAction` or `guardModuleWrite` to every optional module action.
4. Add tests that assert direct URL/action access is blocked when entitlement is disabled.
5. Keep data retained when modules are disabled.

Exit criterion:

Scenario E works for at least inventory, manufacturing, quality, and one service module.

### Phase 2: Prove blank tenant

1. Add a blank tenant seed/test fixture with only core enabled.
2. Ensure no VEDA/manufacturing/restaurant demo data is created.
3. Render empty portal/dashboard state from configuration.
4. Verify optional routes redirect/block.
5. Verify optional actions throw.

Exit criterion:

Scenario A works without code changes or manual cleanup.

### Phase 3: Convert dashboard to module-composed widgets

1. Add `dashboardWidgets` to module definitions.
2. Build a dashboard resolver from entitlements and permissions.
3. Replace `switch(resolvePackKey(factory.industry))` with composition.
4. Keep vertical dashboards only as temporary pack-level compositions.

Exit criterion:

Two tenants with different module sets see different dashboards without editing dashboard code.

### Phase 4: Create a real module contract

1. Introduce `createModule()` and a minimal module SDK.
2. Move one mature module to the contract.
3. Module owns permissions, nav, routes, guards, services, tests, and dashboard widgets.
4. Create a module harness that tests install, disable, permission denial, and tenant isolation.

Best pilot:

Use `helpdesk`, `assets`, or `projects`, not manufacturing. They are newer, already guarded, and less tangled with VEDA assumptions.

### Phase 5: Extract VEDA/manufacturing

1. Treat current production/QC/floor/order-taking flows as the VEDA Manufacturing module.
2. Keep reusable primitives in Core only where they are truly generic:
   - identity,
   - tenancy,
   - roles/permissions,
   - files,
   - notifications,
   - audit,
   - workflow primitives,
   - module registry,
   - configuration framework.
3. Move factory-specific terminology and Carxen/automotive assumptions behind manufacturing or automotive modules.

Exit criterion:

Core can provision a restaurant, service business, or blank tenant without production/QC/factory concepts leaking into the portal.

## Acceptance Checklist Against The Vision

| Scenario | Current Status | Evidence |
| --- | --- | --- |
| Blank client | Not proven | Provisioning defaults modules; dashboard has auto-components fallback |
| Enable module changes sidebar | Partially works | Registry nav + entitlement resolver exist |
| Enable module changes routes | Partially works | Newer pages guarded; older pages not guarded |
| Disable module blocks API | Not complete | Older action files lack module guards |
| Different clients see different modules | Partially works | Organization-scoped entitlements exist |
| New reusable custom module | Not ready | No package/SDK contract yet |
| Client-specific configuration | Partial | Entitlement `settings` exists, but module settings schema is not implemented |
| Packs | Partially works | Pack definitions and apply action exist |
| System templates | Not implemented | No saved composition model found |
| Versioned module deployment | Not implemented | Static code version only |

## Bottom Line

Verity is no longer just raw VEDA code with a new logo. There has been meaningful module-platform work.

But it is still not architecturally complete for the pasted vision. The repo is in the middle: module-aware shell and entitlements on top of a fixed VEDA-derived app.

The highest-value next task is not adding Kent's/restaurant features or building many modules. It is making module enablement authoritative across:

- nav,
- pages,
- server actions,
- permissions,
- dashboard,
- seeded data,
- tests.

Once one module can be installed, used, disabled, re-enabled, permission-filtered, and reused across two blank tenants, Verity will have crossed the line from "SaaS app with modules" to "module-driven operating platform."
