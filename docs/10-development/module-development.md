# Module Development

This is the coding rulebook for new or migrated Verity modules.

## Before Building

For every requirement:

1. Search existing modules.
2. Try configuration.
3. Try composition.
4. Try extension.
5. Design a reusable module.
6. Document client-specific exception only if no reusable abstraction is valid.

## Module Checklist

A module must define:

- module key,
- purpose,
- dependencies,
- permissions,
- navigation,
- routes/pages,
- server actions/API,
- data ownership,
- settings schema,
- dashboard widgets,
- workflows/events,
- tenant isolation behavior,
- disable/reactivation behavior,
- tests.

## Required Guards

Pages:

```ts
import { guardModulePage } from "@/platform/modules/guard";

export default async function Page() {
  await guardModulePage("module_key");
}
```

Server actions:

```ts
import { guardModuleWrite } from "@/platform/modules/guard";

export async function createThing() {
  const organizationId = await guardModuleWrite("module_key");
}
```

Read-only actions use `guardModuleAction`.

## Tenant Isolation

Every resource query must scope to the current session's tenant/workspace. Do not accept tenant identifiers from form input or browser state as the security boundary.

## Cross-Module Access

A module can only use another module through a declared dependency and stable service boundary.

Avoid direct Prisma reads into another module's owned tables.

## Forbidden

- hardcoded tenant/client checks,
- pack or industry switches for business logic,
- shell edits for module nav,
- dashboard switch edits for module widgets,
- business logic inside React page components,
- demo data seeded into all tenants,
- unguarded optional module server actions.
