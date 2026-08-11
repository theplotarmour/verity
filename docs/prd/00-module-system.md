# PRD 00 — Module System

**Phase A · Blocks every other PRD**

## Problem

Verity can already turn modules on and off per tenant. What it cannot do is
treat a module as a *thing*: something with a version, an owner, a price, a
place to put its code, and a contract that survives the core changing
underneath it.

Concretely, today:

- `ModuleDefinition` in `src/platform/modules/registry.ts` has `key`, `name`,
  `description`, `requires`, `permissions`, `alwaysOn`, `vertical`. No version,
  no price, no navigation, no ownership of routes or tables.
- Navigation is `navGroups`, a hardcoded array in `owner-shell.tsx`. It filters
  on `requiredModule`, so a disabled module's links vanish — but adding a module
  still means editing the shell.
- Every Prisma model lives in one `schema.prisma`, now past 2,500 lines.
- Nothing prevents a module's server action from importing another module's
  internals directly.

None of this is broken. It is the reason a new module currently costs a day of
touching six shared files instead of an hour in one folder.

## Why it matters now

The pricing model in PRD 01 needs a price per module. The module store in PRD 03
needs a manifest to render. The AI assistant in PRD 02 needs a machine-readable
description of what a tenant has active, so it does not invent fields. All three
read the same structure, and all three are cheaper to build once that structure
exists than to build three times against a registry that has to change anyway.

The versioning point is the one with a deadline. There are no external module
developers yet, so there is nothing to break. Adding `version` after the first
partner ships is a migration; adding it now is a field.

## Goals

1. A module declares itself in one manifest, and the platform reads everything
   it needs from that — nav, permissions, price, dependencies, version.
2. Activating or deactivating a module is a single tenant-scoped operation with
   a dependency check and an audit trail.
3. Adding a module means adding a folder, not editing the shell.

## Non-goals

- **Runtime code loading.** Modules ship in the same deploy as core. A plugin
  architecture that loads untrusted code at runtime is a security surface nobody
  is asking to pay for, and the store in PRD 03 works fine with build-time
  modules.
- **Splitting `schema.prisma` in this phase.** It is tempting and it is a
  separate, riskier change. See *Deferred* below.
- **Removing `navGroups` wholesale.** Production nav has role carve-outs
  (`STORE_MANAGER` sees three destinations) that must survive. Migrate group by
  group.

## The manifest

Extends `ModuleDefinition` rather than replacing it, so the 16 existing modules
keep working while they are migrated one at a time.

```ts
export interface ModuleManifest extends ModuleDefinition {
  /**
   * Semver. Bumping the major means a breaking contract change and requires a
   * migration note. Core promises not to break a module within a major.
   */
  version: string;

  /** Soft dependencies. The module works without these; features unlock with them. */
  optional?: ModuleKey[];

  /** Where this module appears in navigation, injected when active. */
  navItems?: ModuleNavItem[];

  /** Settings pages this module contributes. */
  settingsRoutes?: { href: string; label: string; requires?: string }[];

  /**
   * 1 = universal, 2 = operations, 3 = vertical.
   *
   * The tier *is* the price — `TIER_PRICE` in `src/platform/pricing.ts` maps it
   * to one published number. There is deliberately no `monthlyPrice` field: a
   * per-module price alongside a tier is two sources for one number, and the
   * original price list broke precisely because a band and a pack total
   * disagreed with nobody noticing.
   *
   * A module needing a bespoke price is a signal the tiers are wrong, and that
   * is a pricing decision, not a manifest field.
   */
  pricingTier: 1 | 2 | 3;
}
```

`navItems` carries what `navGroups` carries today — `href`, `label`, `icon`,
`group`, and both the registry permission key and the legacy `Permission`
union — so migration is a move, not a rewrite.

## Requirements

### R1 — Manifest registry
Every module exports a manifest. A single `allManifests()` resolves them.
`withDependencies()` keeps its current behaviour and additionally refuses to
resolve a manifest whose `requires` names a module that does not exist.

**Acceptance:** a test asserts every `ModuleKey` has a manifest, every
`requires` and `optional` entry resolves, and no two manifests share a key.

When manifests land, `pricingTier()` in `pricing.ts` — which currently *derives*
the tier from `vertical` and a hardcoded Tier 1 list — reads it from the
manifest instead. `pricing.test.ts` already asserts every vertical module is
Tier 3, so the migration is covered before it starts.

### R2 — Navigation from manifests
The shell builds its nav from active modules' `navItems` instead of a hardcoded
array. Group order stays configuration in the shell; membership comes from
modules.

**Acceptance:** deleting a module's `navItems` removes exactly its links and
nothing else. The `STORE_MANAGER` carve-out and the four existing filters
(module entitlement, registry grant, legacy permission, role) behave identically
before and after — asserted by a test that renders the nav for each role.

### R3 — Installer
`activateModule(orgId, key)` and `deactivateModule(orgId, key)`, both HQ-guarded.

- Activation pulls in `requires` transitively and reports what it added.
- Deactivation refuses if another **active** module lists it in `requires`, and
  names the blocker.
- `alwaysOn` modules cannot be deactivated.
- Both write an `AuditLog` row.

Deactivation **hides, never deletes.** This is already true and must stay true:
the guide promises "turning a module off only hides it", and a tenant who
disables Billing for a month and re-enables it must find their invoices.

**Acceptance:** a test activates `manufacturing` on a tenant with no
`inventory`, asserts `inventory` came with it; then deactivates `inventory` and
asserts refusal naming `manufacturing`.

### R4 — Module-scoped permissions
The permission matrix only offers grants belonging to active modules. Grants
already held for a module that is later deactivated are retained, not stripped —
reactivating must not silently drop someone's access.

**Acceptance:** deactivate a module, confirm its permission keys disappear from
the matrix UI and that `Role` rows still hold them; reactivate, confirm they
return.

### R5 — Ownership boundaries
A module's code lives under `src/modules/<key>/`. Cross-module imports go
through a public `index.ts`; reaching into another module's internals fails
lint.

**Acceptance:** an ESLint `no-restricted-imports` rule, plus one deliberate
violation in a fixture proving it fires.

### R6 — Versioning
`version` is required. A CI check fails a PR that changes a module's public
surface — its manifest, exported actions, or Prisma models — without bumping it.

**Acceptance:** the check fails on a PR that adds a required field to a module's
exported action signature with no version bump.

## Deferred, with reasons

**Multi-file Prisma schema.** Prisma's `prismaSchemaFolder` would let each
module own its models, which is what the architecture claims. It is deferred
because the current schema has cross-module relations everywhere — `SalesOrder`
alone points at `ItemMaster`, `Customer`, `Site`, `User` and `ProductionBatch` —
and splitting it is a mechanical change with a long tail of relation errors and
no user-visible benefit. Do it when a module is genuinely being extracted, not
before.

**Runtime module loading.** See non-goals.

## Risks

| Risk | Mitigation |
|---|---|
| Nav migration silently changes who sees what | Per-role nav snapshot test written *before* the migration, run after |
| The manifest becomes a dumping ground | `pricingTier` and `monthlyPrice` are the only non-structural fields allowed; anything else goes in `settings` |
| Deactivation orphans data a tenant later needs | Hide-never-delete is a requirement, not a default |
| Version bumps get skipped | CI check, not a convention |

## Success criteria

- A new module is a folder plus a manifest. No shared file is edited to add one.
- Deactivating a module removes its nav, its permission grants from the matrix,
  and its routes — and returns all three intact on reactivation.
- Every module carries a version, and CI refuses a surface change without a bump.
