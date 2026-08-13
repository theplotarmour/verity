# Module SDK

The Module SDK is the target developer contract for building modules consistently.

It is not fully implemented yet. Current code uses a central registry array in `src/platform/modules/registry.ts`.

## Goal

A developer should be able to add a module without editing shared shell, dashboard, permission, billing, or route resolver code.

## Target API

```ts
export const proofOfDeliveryModule = createModule({
  id: "proof_of_delivery",
  name: "Proof of Delivery",
  version: "1.0.0",
  dependencies: ["core", "files", "customers"],
  permissions: [
    permission("pod.view", "View proof of delivery"),
    permission("pod.capture", "Capture delivery proof"),
  ],
  navigation: [
    navItem({
      href: "/owner/proof-of-delivery",
      label: "Proof of Delivery",
      permission: "pod.view",
    }),
  ],
  dashboardWidgets: [],
  routes: [],
  settings: {},
  events: [],
  workflows: [],
});
```

## Module Folder Contract

Target structure:

```text
modules/<module-key>/
  manifest.ts
  schema.md
  services/
  actions/
  routes/
  ui/
  permissions.ts
  navigation.ts
  workflows.ts
  events.ts
  settings.ts
  tests/
```

The repo is not there yet. Until then, module-owned code must still follow the same ownership rules even if files live under `src/app/owner`, `src/server/actions`, and shared `prisma/schema.prisma`.

## Required Harness

Every module needs tests for:

- installation for a blank tenant,
- dependency expansion,
- disable and re-enable,
- route blocking when disabled,
- action/API blocking when disabled,
- permission denial,
- tenant isolation,
- dashboard/nav contribution,
- settings validation,
- upgrade path.

Do not build many modules before this harness exists for one pilot module.
