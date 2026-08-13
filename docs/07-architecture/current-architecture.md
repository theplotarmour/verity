# Current Architecture

This document describes repo truth, not the final target.

## Stack

- Next.js 16 App Router.
- React 19.
- Prisma 6.
- PostgreSQL/Supabase.
- Tailwind 4.
- Server Actions for internal mutations.

## Existing Platform Foundations

The repo already has:

- module registry: `src/platform/modules/registry.ts`,
- entitlement lookup: `src/platform/modules/entitlements.ts`,
- module guards: `src/platform/modules/guard.ts`,
- navigation resolver: `src/platform/modules/navigation.ts`,
- tenant provisioning: `src/platform/tenancy/provision.ts`,
- pack definitions: `src/platform/tenancy/packs.ts`,
- RBAC resolver: `src/platform/rbac/permissions.ts`,
- HQ module toggles: `src/app/verity/clients/[id]` and `src/server/actions/hq.ts`.

## Current Gaps

The app is not yet fully module-driven:

- Some optional module pages lack `guardModulePage`.
- Some legacy server actions lack `guardModuleAction` or `guardModuleWrite`.
- Dashboard still switches by industry/pack.
- `Factory` remains the primary workspace model.
- VEDA manufacturing concepts remain in central schema, pages, components, and copy.
- The module SDK/package boundary is not implemented.
- Blank tenant behavior is not fully proven.

See [../VERITY_MODULE_PLATFORM_AUDIT_2026-08-13.md](../VERITY_MODULE_PLATFORM_AUDIT_2026-08-13.md).
