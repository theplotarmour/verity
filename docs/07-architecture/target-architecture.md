# Target Architecture

Verity target architecture is a modular platform with strict separation between Core, Modules, Packs, System Templates, Client Configuration, and Client Data.

## Target Layers

```text
Verity Core
  Module Registry
  Entitlement Engine
  RBAC
  Tenant Isolation
  Dynamic Navigation
  Dynamic Dashboard
  Events
  Workflow Primitives
  Audit
  Billing/Subscription State

Modules
  Manifest
  Data Ownership
  Services
  Actions/API
  UI
  Routes
  Permissions
  Navigation
  Widgets
  Workflows
  Events
  Settings
  Tests

Packs
  Module lists
  Pricing
  Commercial metadata

System Templates
  Reusable operational compositions

Client Configuration
  Enabled modules
  Settings
  Roles
  Fields
  Workflows
  Dashboard layout
  Branding

Client Data
  Tenant-owned records
```

## Security Boundary

Every backend read/write must derive tenant context from authenticated session state.

Resource queries must scope by the appropriate tenant/workspace key. Existing code often uses `factoryId`; target architecture may evolve terminology, but the invariant remains: no bare-id cross-tenant access.

## Module Boundary

A module depends on Core. Core must not depend on optional modules.

Optional modules may depend on other modules only through declared dependencies and stable exported service contracts.

## Dynamic Shell

Navigation and dashboard are resolved from:

- enabled modules,
- permissions,
- module manifests,
- user role/context,
- module settings.

No shared shell code should need editing when a module is enabled for a tenant.

## Empty Tenant

Blank tenant is a first-class state, not an error:

- Core workspace exists.
- Business modules are absent.
- Portal shows configuration guidance.
- Optional routes/actions are blocked.
- No fake domain data is seeded.
