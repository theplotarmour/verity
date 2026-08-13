# Legacy Module Reference

This folder is retained for older links. The canonical module documentation now starts at [../02-modules/README.md](../02-modules/README.md), and the executable registry remains `src/platform/modules/registry.ts`.

## Current Implementation Status

Verity has a real module registry and entitlement model, but the module platform is not complete.

Built or partially built:

- `ModuleEntitlement` per organization,
- module dependency expansion,
- module-aware navigation,
- HQ module toggles,
- some page/action guards,
- pricing and pack definitions.

Not complete:

- every optional page/action is not yet guarded,
- module-owned tables are still convention inside one Prisma schema,
- true module package folders are not implemented,
- dashboard widgets are not yet module-composed,
- blank tenant behavior is not fully proven.

## Current Registry Source

Use `src/platform/modules/registry.ts` as the code source for current module keys.

Module docs:

- [../02-modules/manufacturing.md](../02-modules/manufacturing.md)
- [../02-modules/restaurant.md](../02-modules/restaurant.md)
- [../02-modules/service-operations.md](../02-modules/service-operations.md)

## Rules

1. Nav items belong to module manifests/registry, not the shell.
2. Optional pages need `guardModulePage`.
3. Optional server actions need `guardModuleAction` or `guardModuleWrite`.
4. Disabling a module hides and blocks access but retains data.
5. Tenant context comes from session.
6. No client-specific conditionals.

See [../10-development/module-development.md](../10-development/module-development.md).
