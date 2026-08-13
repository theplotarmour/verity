# Verity

Verity is a module-driven business operating platform built with Next.js, Prisma, and PostgreSQL.

The product goal is not "a SaaS app with modules." Verity is a platform where internal admins assemble reusable modules, packs, and system templates into configured tenant workspaces.

## Canonical Documentation

The canonical product and architecture authority lives in [docs/](./docs).

Start here:

1. [docs/README.md](./docs/README.md)
2. [docs/00-foundation/vision.md](./docs/00-foundation/vision.md)
3. [docs/00-foundation/terminology.md](./docs/00-foundation/terminology.md)
4. [docs/01-platform/module-registry.md](./docs/01-platform/module-registry.md)
5. [docs/07-architecture/current-architecture.md](./docs/07-architecture/current-architecture.md)
6. [docs/10-development/module-development.md](./docs/10-development/module-development.md)

## Repository Layout

| Path | Purpose |
| --- | --- |
| `src/app` | Next.js App Router pages, layouts, route handlers |
| `src/platform` | Platform primitives: tenancy, module registry, RBAC, billing |
| `src/server/actions` | Server Actions, including legacy and module-owned actions |
| `src/components` | UI components, dashboards, shell, module surfaces |
| `prisma/schema.prisma` | Current database schema |
| `docs` | Canonical product, architecture, migration, and development docs |

## Current Architecture Status

Verity is in a migration phase from VEDA-derived manufacturing software toward a general-purpose modular platform.

Already present:

- central module registry,
- organization-scoped module entitlements,
- pack definitions,
- entitlement-aware navigation,
- HQ module toggles,
- newer module route/action guards,
- registry-based RBAC resolver.

Still incomplete:

- full route/action entitlement coverage,
- blank-client portal proof,
- module-composed dashboard widgets,
- true module package/SDK boundary,
- VEDA manufacturing extraction from core app surfaces.

See [docs/VERITY_MODULE_PLATFORM_AUDIT_2026-08-13.md](./docs/VERITY_MODULE_PLATFORM_AUDIT_2026-08-13.md) for the evidence-backed audit.

## Development Commands

```bash
npm run typecheck
npm run test
npm run build
```

Read `AGENTS.md` before editing UI. This repo uses Next.js 16; read the local Next.js docs in `node_modules/next/dist/docs/` before changing framework-sensitive code.
