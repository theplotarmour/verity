# Dynamic Navigation

Client navigation must come from configuration.

## Resolution Flow

```text
Module Registry
  Tenant Enabled Modules
    User Permissions
      Navigation Resolver
        Sidebar / Mobile Dock
```

Current implementation: `src/platform/modules/navigation.ts` and `src/components/layout/owner-shell.tsx`.

## Rules

- Do not hardcode module nav in the shell.
- Do not show a module because a pack is active; show it because the module is enabled.
- Do not show an item unless the user has permission.
- Do not rely on nav hiding as security.
- Direct route access must still be guarded.

## Blank Tenant

If no optional business modules are enabled, the portal shows only Core destinations and empty workspace guidance.

The target behavior is not "unknown entitlements show everything." Any compatibility fallback must be removed from production paths once migration is complete.
