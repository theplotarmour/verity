# Packs

Packs are curated bundles of module keys for pricing, onboarding, and admin convenience.

Current implementation: `src/platform/tenancy/packs.ts`.

## Pack Rules

1. Packs contain no business logic.
2. Code must check module entitlement, not pack identity.
3. A module remains independently identifiable after a pack is applied.
4. Pack prices must move when included module prices change.
5. Applying a pack should show which modules and dependencies will be enabled.
6. Removing a pack should not delete module data.

## Correct Usage

```ts
const modules = modulesForPack("restaurant_ops");
await updateTenantModules(organizationId, modules);
```

## Incorrect Usage

```ts
if (factory.industry === "restaurant_ops") {
  showKitchen();
}
```

## Target Admin Flow

```text
Open Client
  Apply Pack
    Preview modules
    Preview dependencies
    Preview price delta
    Deploy entitlement changes
```

## Pack vs System Template

A pack is primarily commercial. A system template is operational. A restaurant pack may enable modules; a restaurant system template can also define roles, workflow defaults, menu starter templates, dashboard layout, and terminology.
