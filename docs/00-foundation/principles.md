# Verity Principles

## Product Principles

1. Build capabilities, not client applications.
2. Configure before customizing.
3. Reuse before rebuilding.
4. Compose modules into systems; do not duplicate module logic inside packs or client folders.
5. Keep Core small and domain-neutral.
6. Treat every custom client request as a candidate reusable module, extension, or configuration.
7. A blank tenant must remain blank until modules are provisioned.

## Engineering Principles

1. Module catalog, client configuration, and client data are separate.
2. Module entitlement is a backend security concern, not only a navigation concern.
3. Tenant context is derived from authenticated session state.
4. Server code must not trust client-supplied tenant identifiers.
5. Optional module pages must call `guardModulePage`.
6. Optional module server actions must call `guardModuleAction` or `guardModuleWrite`.
7. Mutating actions must also honor subscription writability.
8. Module data is retained when a module is disabled.
9. A module may only access another module through a declared dependency and a stable service/API boundary.
10. Legacy VEDA concepts must be isolated behind manufacturing or automotive modules unless proven reusable.

## Anti-Patterns

Never add:

```ts
if (tenantId === "kent") {}
if (factory.industry === "restaurant_ops") {}
if (clientName.includes("Carxen")) {}
```

Never solve a module requirement by:

- adding nav directly to the shell,
- adding dashboard panels directly to a vertical switch,
- putting business logic in a page component,
- accepting `factoryId`, `organizationId`, or `tenantId` from the browser as the security boundary,
- copying a module into a client-specific folder,
- seeding VEDA or restaurant demo data into every new tenant.

## Decision Order For New Requirements

Every new client requirement must be evaluated in this order:

1. Configuration inside an existing module.
2. Existing module with a different setup.
3. Composition of multiple existing modules.
4. Optional extension to an existing module.
5. New reusable module.
6. Client-specific exception.

Client-specific exception is the last resort and must be documented in [../09-client-implementations](../09-client-implementations).
