# AI And Agent Implementation Rules

Coding agents must preserve the Verity platform model.

## Before Editing

Read:

1. `docs/README.md`
2. `docs/00-foundation/vision.md`
3. `docs/00-foundation/principles.md`
4. `docs/00-foundation/terminology.md`
5. `docs/07-architecture/current-architecture.md`
6. `docs/10-development/module-development.md`

If touching VEDA-derived flows, also read:

- `docs/00-foundation/veda-legacy-context.md`
- `docs/08-veda-migration/migration-overview.md`
- `docs/08-veda-migration/current-extraction-map.md`

## Completion Claims

Do not claim launch-ready or architecturally complete unless repo-backed verification proves:

- blank tenant behavior,
- entitlement-gated navigation,
- direct route blocking,
- server action blocking,
- tenant isolation,
- data retention on disable,
- tests/build passing.

## Common Failure

Do not make local feature fixes that reinforce the wrong architecture:

- adding vertical dashboard switches,
- adding shell nav manually,
- adding broad legacy permissions,
- adding tenant-specific branches,
- seeding all tenants with domain data.

## Preferred Fix Shape

When possible:

- move behavior into module manifest/configuration,
- add server-side guards,
- add tests around entitlement and tenant isolation,
- document current gaps honestly.
