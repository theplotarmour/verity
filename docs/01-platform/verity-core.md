# Verity Core

Verity Core is the domain-neutral platform layer. It exists so modules can be installed, configured, authorized, rendered, audited, and reused without each module rebuilding platform infrastructure.

## Core Owns

- Authentication and session identity.
- Organizations, memberships, and workspace context.
- Users and role assignment.
- RBAC primitives and permission resolution.
- Module registry and entitlement lookup.
- Navigation and dashboard resolution.
- Files and upload validation.
- Notifications and audit events.
- Subscription writability checks.
- Global search and command framework.
- Shared workflow/event primitives.
- Shared UI shell and design system.

## Core Does Not Own

- Manufacturing work orders.
- Factory shop-floor routing.
- Restaurant kitchen tickets.
- Franchise scoring.
- Asset maintenance.
- Procurement.
- CRM pipeline.
- Industry-specific seed data.
- Client-specific business rules.

Those belong in modules.

## Current Code Anchors

| Concern | Current path |
| --- | --- |
| Module registry | `src/platform/modules/registry.ts` |
| Entitlements | `src/platform/modules/entitlements.ts` |
| Module guards | `src/platform/modules/guard.ts` |
| Navigation resolver | `src/platform/modules/navigation.ts` |
| RBAC resolver | `src/platform/rbac/permissions.ts` |
| Tenant provisioning | `src/platform/tenancy/provision.ts`, `src/platform/tenancy/provision-core.ts` |
| Packs | `src/platform/tenancy/packs.ts` |
| Owner shell | `src/components/layout/owner-shell.tsx` |

## Core Invariant

A blank tenant with only Core enabled must not see or access business modules.

Core can show:

- workspace identity,
- users/team,
- settings,
- module activation status,
- empty dashboard state,
- billing/subscription state,
- admin/configuration prompts.

Core must not show production, restaurant, service, asset, inventory, procurement, CRM, or quality module surfaces unless entitled.
