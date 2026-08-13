# Verity Architecture

> **Build capabilities, not client applications.**
> Build modules, not features buried inside pages.
> Compose modules, don't duplicate them.
> Configure before customizing. Customize before rebuilding.
> No client-specific hacks in the core.

This document is the engineering law of this codebase. Read it before writing any feature.

---

## The core idea

Verity is not a collection of features. Verity is a system for assembling reusable operational blocks into configurable business systems.

A developer should be able to build a module once, register it, and reuse it across completely different customers, packs, and systems without rewriting the core application.

This is what separates a ₹10k single-module deployment from a ₹10L customized operational system — and it only works if every developer builds to the contract, not to the client.

---

## Four layers

```
VERITY
│
├── CORE (always-on substrate)
├── MODULES (independent business capabilities)
├── PACKS (curated module bundles for a vertical)
└── SYSTEMS (tenant-specific compositions)
```

### Layer 1 — Core

Things every Verity installation understands. These never belong to a module.

**Built today:**
- Organizations / tenants (`Factory`, `User`, `SystemRole`)
- Roles and permissions (`Permission`, `PermissionMatrix`, `guardModuleWrite`)
- Notifications (`Notification` model, read/dismiss)
- Audit logs (append-only pattern)
- Module registry + navigation resolver (`registry.ts`, `navigation.ts`)
- Subscription lifecycle (`TenantSubscription`, cron)
- Settings and branding

**Planned:**
- Workflow engine (state transitions are currently per-module; a shared engine would let any module declare a state machine)
- Automation engine (event-triggered rules: "when X, do Y across any module")
- Configurable form system (spec sheets are the seed; generalizing them is the path)
- Dashboard widget registry (each module contributes widgets; dashboards compose them)

### Layer 2 — Modules

Independent business capabilities. Each module owns its data, logic, API, UI, permissions, and nav items. **A module must work without knowing anything about other modules except its declared dependencies.**

Current module library: see [`docs/modules/README.md`](./modules/README.md).

### Layer 3 — Packs

A curated composition of modules for a named vertical. A pack is configuration — it lists module keys and a price. It contains **zero business logic of its own**.

Current packs: see [`docs/modules/packs.md`](./modules/packs.md).

### Layer 4 — Systems

A tenant's specific deployment: which modules are active, which roles exist, which workflows run, what the dashboard shows. This is the configuration layer. It references module IDs — it never contains module implementations.

```ts
// Kent's system — this is all it should be
{
  enabledModules: ["core", "hr", "menu", "tables_orders", "kitchen", "serving", "billing"],
  pack: "restaurant_ops",
}
```

---

## The module contract

Every module in Verity follows the same contract. Deviation is a bug, not a feature.

### What a module declares

```ts
{
  key: "inspections",           // unique, stable, lowercase_snake
  version: "1.0.0",             // semver; breaking public surface = major bump
  name: "Inspections",
  description: "...",
  requires: ["core"],           // explicit dependencies only — not "everything"
  permissions: [                // all permissions this module can grant
    { key: "inspection.view",   label: "View inspections",   group: "Inspections" },
    { key: "inspection.create", label: "Create inspections", group: "Inspections" },
    { key: "inspection.submit", label: "Submit inspections", group: "Inspections" },
    { key: "inspection.approve",label: "Approve inspections",group: "Inspections" },
  ],
  navItems: [
    { href: "/owner/inspections", label: "Inspections", iconKey: "clipboard",
      group: "Operations", requires: "inspection.view" },
  ],
}
```

This definition is the **only source of truth** for what this module contributes to the shell, the permission matrix, and the nav. Nothing is hardcoded elsewhere.

### What a module owns

- **Schema**: its own models. `factoryId` on every root model — no exceptions.
- **Server actions**: in `src/server/actions/<module>.ts`. Every mutating action calls `guardModuleWrite`.
- **UI**: its own pages under `src/app/owner/<module>/`.
- **Permissions**: declared in the registry, granted to roles, checked by `can()`.
- **Nav items**: declared in the registry, resolved by `navigation.ts` — never added to the shell directly.

### What a module does NOT do

- It does not reach into another module's database tables directly.
- It does not export a `factoryId` parameter from any server action.
- It does not use `if (tenant === "xyz")` or `if (isKents)` — ever.
- It does not assume other modules exist unless they are in its `requires` list.

---

## The three isolation rules

These are not guidelines. They are enforced by `tenant-isolation.test.ts`.

### Rule 1 — Every query is tenant-scoped

```ts
// ✅ Correct
prisma.inspectionReport.findFirst({ where: { id, factoryId: user.factoryId } })

// ❌ Wrong — another tenant's row is one guess away
prisma.inspectionReport.findUnique({ where: { id } })
```

Use `findFirst` with `{ id, factoryId }` for detail lookups. Never `findUnique` by bare id.

### Rule 2 — factoryId comes from the session

```ts
// ✅ Correct
const user = await requireUser();
const data = await prisma.order.findMany({ where: { factoryId: user.factoryId } });

// ❌ Wrong — caller-supplied factoryId is attacker-supplied factoryId
async function getOrders(factoryId: string) { ... }
```

### Rule 3 — Cross-module access through the public surface only

A module's `index.ts` is its public API. Reaching into its internals couples you to its refactors and breaks the version promise.

---

## How modules communicate

Modules do not call each other's server actions directly. They communicate through shared models and the notification system.

**Today's pattern** (events via the `Notification` model):

```
Kitchen module
  → markReady()
  → writes Notification to all users with serving.view
  → Serving module reads Notification list
```

**The aspiration** (event bus — not built yet):

```
kitchen.order.ready
    ↓ event bus
    ├── serving module subscribes → updates its queue
    ├── notification engine subscribes → alerts servers
    └── dashboard engine subscribes → decrements "in kitchen" counter
```

Until the event bus exists: fire notifications after the primary write, in a try/catch that swallows. Food must reach the pass whether or not a notification row was written.

---

## Anti-patterns — explicitly banned

### ❌ Client-specific conditionals

```ts
// Never. Not once. Not "just for now".
if (tenant === "kents") { showKitchenModule(); }
if (tenantId === "abc123") { specialWorkflow(); }
if (isKents) { renderKentsView(); }
```

A business system is a composition of modules and configuration. Kent's gets the restaurant pack — not special code.

### ❌ Copy-pasting modules for a client

```
restaurant-orders/
restaurant-orders-kent/       ← NO
restaurant-orders-mumbai/     ← NO
```

Build one module. Configure it per tenant.

### ❌ Business logic inside page components

```tsx
// Wrong — workflow logic in a React component
function KitchenPage() {
  async function accept(orderId) {
    const order = await prisma.diningOrder.update(...); // ← NO
  }
}
```

Pages call server actions. Server actions contain logic.

### ❌ Packs containing business logic

A pack is a list of module keys and a price. If a pack file contains anything other than that, it's in the wrong place.

### ❌ Assuming every tenant has every module

```ts
// Wrong — assumes manufacturing exists
const jobs = await prisma.jobCard.findMany(...);

// Right — gated by entitlement
if (enabledModules.includes("manufacturing")) {
  const jobs = await prisma.jobCard.findMany(...);
}
```

Every page, every action, every query that touches a non-core model should be behind a module gate.

---

## How to decide what to build

When a new requirement arrives, climb this ladder before writing code:

1. **Is this configuration?** → no code. Change a setting.
2. **Do existing modules cover it?** → compose them. Write a pack entry or a dashboard.
3. **Is this a combination of existing modules?** → write a pack. No new module.
4. **Is this a genuinely reusable capability?** → write a module. Follow the contract.
5. **Is this unique to one client?** → still write a proper module. Mark it vertical-scoped if needed. Never embed client logic in core.

---

## The "can we move it?" test

Give yourself this test before shipping any module:

> **Can we take this module, remove it from one system, add it to a completely different system, configure it differently, connect it to different modules, and deploy it — without modifying the module's core code?**

If yes: the module is built correctly.

If no: find what's coupling it and cut it.

And the second test:

> **Can we build a completely new business system primarily by selecting existing modules and configuring their relationships, rather than writing a new application?**

This is the end state. Every module that ships moves the answer closer to yes.

---

## Current state vs the end state

| Capability | Status |
|---|---|
| Module registry + versioned contracts | ✅ Built |
| Module-owned nav (registry → shell) | ✅ Built |
| Module-scoped permissions | ✅ Built |
| Tenant isolation enforcement (test) | ✅ Built |
| Module installer with dependency graph | ✅ Built |
| Subscription lifecycle + write guard | ✅ Built |
| Navigation resolver (one function, no duplication) | ✅ Built |
| Module-owned server actions | ✅ Built (convention) |
| Event bus (cross-module communication) | ❌ Not built — Notification model is the interim |
| Workflow engine (configurable state machines) | ❌ Not built — per-module state logic today |
| Configurable form system | ❌ Spec sheets exist; generalization is future |
| Dashboard widget registry | ❌ Not built — per-pack dashboards today |
| `src/modules/<key>/` folder structure | ❌ Deferred (PRD 03, ~Nov 2026) |
| Import boundary lint | ❌ Deferred (PRD 03, ~Nov 2026) |

The gaps between "built" and "not built" are known. They are not excuses to work around the contract — they are the next things to build.

---

## References

- Module registry: [`src/platform/modules/registry.ts`](../src/platform/modules/registry.ts)
- Navigation resolver: [`src/platform/modules/navigation.ts`](../src/platform/modules/navigation.ts)
- Pricing: [`src/platform/pricing.ts`](../src/platform/pricing.ts)
- Pack definitions: [`src/platform/tenancy/packs.ts`](../src/platform/tenancy/packs.ts)
- Write guard: [`src/server/actions/writeguard.js`](../src/server/actions/writeguard.js)
- Isolation test: [`src/tests/tenant-isolation.test.ts`](../src/tests/tenant-isolation.test.ts)
- PRDs: [`docs/prd/`](./prd/)
