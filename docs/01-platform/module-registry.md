# Module Registry

The Module Registry is the authority for what capabilities exist in Verity.

Current implementation: `src/platform/modules/registry.ts`.

## Registry Responsibilities

The registry defines:

- module key,
- name and description,
- semantic version,
- lifecycle status,
- category,
- dependencies,
- permissions,
- navigation contributions,
- dashboard widget contributions,
- settings schema,
- workflow/event declarations,
- ownership metadata.

The current code supports some of this now: module key, version, dependency list, permissions, navigation, `alwaysOn`, and a `vertical` hint.

## Required Module Definition

Target shape:

```ts
export const inspectionsModule = createModule({
  id: "inspections",
  name: "Inspections",
  version: "1.0.0",
  status: "ACTIVE",
  category: "Operations",
  dependencies: ["core", "files"],
  permissions: [],
  navigation: [],
  dashboardWidgets: [],
  routes: [],
  settingsSchema: {},
  events: [],
  workflows: [],
});
```

## Entitlements

Current implementation: `ModuleEntitlement` in `prisma/schema.prisma`.

An entitlement answers:

> Which modules does this organization have?

Target fields:

- organization id,
- module id,
- enabled flag,
- deployed version,
- configuration,
- enabled timestamp,
- disabled timestamp,
- expiry,
- lifecycle state,
- migration state.

Current code has `organizationId`, `moduleKey`, `enabled`, `expiresAt`, and `settings`.

## Lifecycle States

The target registry must distinguish:

- `DRAFT`
- `DEVELOPMENT`
- `BETA`
- `ACTIVE`
- `DEPRECATED`
- `ARCHIVED`

Only `ACTIVE` modules should be generally provisionable. `BETA` modules may be enabled only for allowed tenants. `DEPRECATED` modules remain usable by existing tenants but should not be selected for new systems.

## Dependency Rules

Dependencies are module-level facts.

Current behavior:

- `withDependencies()` expands requested modules.
- Disabling a dependency is blocked when another enabled module still requires it.

Required behavior:

- A module may import/use another module only if the dependency is declared.
- Tests should detect undeclared cross-module imports or direct table access.
- Dependency installation must be visible to admins before billing changes.

## Disabling A Module

Disabling a module:

- sets entitlement `enabled = false`,
- removes navigation,
- blocks direct routes,
- blocks APIs/actions,
- retains data,
- keeps audit history,
- allows later reactivation.

It must never hard-delete module data as the default operation.
