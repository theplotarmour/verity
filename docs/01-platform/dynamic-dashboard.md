# Dynamic Dashboard

The target dashboard is module-composed.

The dashboard should not switch on industry, pack, tenant type, or client name. It should render widgets contributed by enabled modules and filtered by permissions.

## Current State

Current owner dashboard code still switches by pack/industry in `src/app/owner/dashboard/page.tsx` and falls back to the auto-components dashboard.

That behavior is transitional and does not satisfy the platform vision.

## Target Resolution Flow

```text
Session
  Organization
    Enabled modules
      Module widget manifests
        User permissions
          Dashboard resolver
            Rendered dashboard
```

## Blank Tenant Behavior

A tenant with only `core` enabled gets:

- workspace name and configuration state,
- "Your workspace has not been configured yet",
- contact/admin activation prompt,
- no business widgets,
- no fake production, restaurant, service, or demo data.

## Widget Contract

Each widget declares:

- id,
- owning module,
- title,
- size,
- required permission,
- data loader,
- empty state,
- error state,
- refresh behavior.

Dashboard composition belongs to platform configuration. Widget data belongs to the owning module.
