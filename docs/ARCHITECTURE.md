# Verity Architecture

This file is kept as a short compatibility entry point. The full architecture authority now lives in the numbered documentation system.

## Read These Instead

1. [README.md](./README.md)
2. [00-foundation/vision.md](./00-foundation/vision.md)
3. [00-foundation/principles.md](./00-foundation/principles.md)
4. [01-platform/verity-core.md](./01-platform/verity-core.md)
5. [01-platform/module-registry.md](./01-platform/module-registry.md)
6. [01-platform/module-sdk.md](./01-platform/module-sdk.md)
7. [07-architecture/current-architecture.md](./07-architecture/current-architecture.md)
8. [07-architecture/target-architecture.md](./07-architecture/target-architecture.md)
9. [07-architecture/security.md](./07-architecture/security.md)
10. [08-veda-migration/migration-overview.md](./08-veda-migration/migration-overview.md)

## Architecture Verdict

Verity is a module-driven operating platform in progress.

Built foundations:

- central module registry,
- organization-scoped module entitlements,
- dependency expansion,
- module-aware navigation,
- HQ module toggles,
- pack definitions,
- newer module route/action guards,
- registry-based RBAC resolver.

Known gaps:

- optional route/action guard coverage is incomplete,
- dashboard is still vertical-switch based,
- true module SDK/package boundary is not implemented,
- VEDA manufacturing concepts still exist in central schema and app surfaces,
- blank tenant behavior is not yet fully proven.

Do not use this file as a completion claim. Use [VERITY_MODULE_PLATFORM_AUDIT_2026-08-13.md](./VERITY_MODULE_PLATFORM_AUDIT_2026-08-13.md) and [11-roadmap/immediate-priorities.md](./11-roadmap/immediate-priorities.md) for current blockers.

For the sequenced plan that closes them — with per-phase exit criteria, the measured
guard coverage, and the open decisions that block Phase 5 — see
[VERITY_COMPLETION_PLAN.md](./VERITY_COMPLETION_PLAN.md).
