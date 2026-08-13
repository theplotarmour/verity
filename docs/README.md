# Verity Documentation

> **Build status: `main` does not compile.** 122 TypeScript errors, from entitlement
> guards inserted into function parameter type literals in five action files
> (`0aa3ff4`, pushed). Fix this before anything else — see Phase 0 of
> [VERITY_COMPLETION_PLAN.md](./VERITY_COMPLETION_PLAN.md).

Verity is a module-driven business operating platform.

It is not a fixed SaaS application with feature modules. It is a platform where Verity admins assemble, configure, version, and provision reusable business capabilities for each client tenant.

## Read First

Read these documents in order before changing product architecture, tenant provisioning, permissions, navigation, dashboards, modules, or VEDA-derived flows:

1. [00-foundation/vision.md](./00-foundation/vision.md)
2. [00-foundation/principles.md](./00-foundation/principles.md)
3. [00-foundation/terminology.md](./00-foundation/terminology.md)
4. [00-foundation/veda-legacy-context.md](./00-foundation/veda-legacy-context.md)
5. [01-platform/verity-core.md](./01-platform/verity-core.md)
6. [01-platform/module-registry.md](./01-platform/module-registry.md)
7. [01-platform/module-sdk.md](./01-platform/module-sdk.md)
8. [03-composition/modules-packs-systems.md](./03-composition/modules-packs-systems.md)
9. [04-admin/system-builder.md](./04-admin/system-builder.md)
10. [05-client/client-portal.md](./05-client/client-portal.md)
11. [07-architecture/current-architecture.md](./07-architecture/current-architecture.md)
12. [07-architecture/target-architecture.md](./07-architecture/target-architecture.md)
13. [08-veda-migration/migration-overview.md](./08-veda-migration/migration-overview.md)
14. [10-development/module-development.md](./10-development/module-development.md)
15. [13-ai/implementation-rules.md](./13-ai/implementation-rules.md)

## Non-Negotiable Rules

1. VEDA is legacy/source code context, not the Verity product model.
2. Build reusable capabilities, not client-specific applications.
3. Module catalog, client configuration, and client data must stay separate.
4. Navigation, dashboard widgets, permissions, routes, and server actions must be derived from module entitlement and user permission state.
5. Frontend hiding is never security. Every optional module route and server action needs server-side entitlement enforcement.
6. Disabling a module hides and blocks it; it does not delete client data.
7. Client-specific behavior belongs in configuration first, reusable module extension second, and one-off code only as an explicit exception.
8. Never add `if (tenantId === "...")`, `if (factory.industry === "...")`, or equivalent client/vertical branching in shared platform code.

## Documentation Map

| Folder | Purpose |
| --- | --- |
| [00-foundation](./00-foundation) | Vision, principles, vocabulary, VEDA separation |
| [01-platform](./01-platform) | Core platform machinery: tenancy, modules, RBAC, dashboard, events |
| [02-modules](./02-modules) | Module catalog and reusable capability specs |
| [03-composition](./03-composition) | Packs, systems, templates, dependency and customization rules |
| [04-admin](./04-admin) | Internal Verity admin control plane and system builder |
| [05-client](./05-client) | Dynamic client portal behavior |
| [06-design](./06-design) | Product design system and UI rules |
| [07-architecture](./07-architecture) | Current architecture, target architecture, security, data model |
| [08-veda-migration](./08-veda-migration) | VEDA extraction, legacy boundaries, migration plan |
| [09-client-implementations](./09-client-implementations) | Client deployment notes as configuration, not architecture |
| [10-development](./10-development) | Developer workflow, module rules, testing, migrations |
| [11-roadmap](./11-roadmap) | Current state and staged priorities |
| [12-decisions](./12-decisions) | Architecture decision records |
| [13-ai](./13-ai) | Instructions for coding agents working in this repo |

## Current Truth

The implementation is in transition. Verity already has a module registry, organization-scoped `ModuleEntitlement`, pack definitions, entitlement-aware navigation, HQ module toggles, and some route/action guards.

It is not yet complete against the platform vision. The current blockers are tracked in [VERITY_MODULE_PLATFORM_AUDIT_2026-08-13.md](./VERITY_MODULE_PLATFORM_AUDIT_2026-08-13.md) and summarized in [11-roadmap/immediate-priorities.md](./11-roadmap/immediate-priorities.md).

Do not convert aspirational target docs into completion claims. When documenting current status, cite the actual code path and whether it is built, partial, or not built.
