# Terminology

Use these words precisely.

## Platform Terms

| Term | Meaning |
| --- | --- |
| Verity Core | Domain-neutral infrastructure every tenant needs: auth, tenancy, users, RBAC, organizations, files, notifications, audit, events, workflow primitives, search, module registry, shell, configuration framework. |
| Module | An installable, independently versioned business capability. A module owns its manifest, permissions, navigation, routes, data, services, settings, workflows, events, and tests. |
| Module Catalog | The internal library of modules Verity can offer. It includes status, version, category, dependencies, ownership metadata, and provisioning rules. |
| Module Entitlement | The tenant-specific record that says an organization has a module enabled, disabled, expired, configured, or deployed at a version. Current code uses `ModuleEntitlement`. |
| Pack | A curated bundle of modules, usually sold/priced for a vertical or common business need. A pack contains no business logic. |
| System | A configured composition of modules, packs, workflows, fields, permissions, dashboards, and terminology for a business. |
| System Template | A reusable starting composition that can be applied to a tenant and then configured. |
| Client Configuration | The enabled modules, settings, workflows, roles, fields, dashboard choices, and branding for one tenant. |
| Client Data | Tenant-owned operational records created inside enabled modules. |

## Tenancy Terms

| Term | Meaning |
| --- | --- |
| Organization | The commercial tenant and entitlement boundary. Module enablement and subscription state are scoped here. |
| Workspace | The operational surface a client uses. Current schema often represents this as `Factory`. |
| Factory | Legacy VEDA schema name for the main operational location/workspace. Do not treat it as proof that every tenant is a factory. |
| `organizationId` | Organization-level entitlement, billing, and tenant membership boundary. |
| `factoryId` | Current location/workspace record scope used across existing tables. It must be derived from session state. |

## Module vs Pack

Code checks modules, not packs.

Correct:

```ts
await guardModulePage("kitchen");
await guardModuleWrite("billing");
```

Incorrect:

```ts
if (factory.industry === "restaurant_ops") {}
```

Packs are commercial compositions. Modules are executable software capabilities.

## VEDA Terms

VEDA terms such as Factory, Production, QC, Worker, Stage, Work Order, Job Card, Vehicle, Seat Cover, Carxen, and automotive fitment belong to manufacturing or automotive modules unless deliberately generalized.
