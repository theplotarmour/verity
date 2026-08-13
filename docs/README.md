# Verity Docs

> **Build capabilities, not client applications. Compose modules, don't duplicate them.**

Start here. Read in this order if you're new.

---

## I'm new — read in this order

1. **[Architecture](./ARCHITECTURE.md)** — the engineering law of this codebase. The four layers, the module contract, the isolation rules, and the anti-patterns that are explicitly banned. **Read this before writing any feature.**
2. **[Module reference](./modules/README.md)** — all modules: what each does, what tier, what it requires, what permissions it contributes, what's built vs planned.
3. **[Pack reference](./modules/packs.md)** — the vertical packs, which modules they include, pricing, and what a tenant sees on their dashboard. Packs are configuration — they contain zero business logic.

---

## I'm building a feature

- **[PRD index](./prd/README.md)** — what to build, in what order, and how you'll know it worked.
- **[Sync guide](./SYNC_GUIDE.md)** — how to port a fix from Veda into Verity (cherry-pick standard, no copy-paste).
- **[Audit log](./AUDIT.md)** — recurring defect patterns and the rules they produced. Read before touching auth, billing, or permissions.
- **[Migrations](./MIGRATIONS.md)** — use `db push`, never `migrate dev`. The wrong command here drops the live database.

---

## I'm deploying

- **[Deployment guide](./DEPLOYMENT.md)**

---

## The one decision that matters before you write code

Before adding anything, climb this ladder:

1. Is this **configuration**? → no code needed.
2. Is this a **combination of existing modules**? → write a pack entry, not a module.
3. Is this a **genuinely reusable capability**? → write a module following the contract.
4. Is this **unique to one client**? → still write a proper module. Never `if (tenant === "xyz")`.

See [`ARCHITECTURE.md §20`](./ARCHITECTURE.md) for the full decision tree.

---

## Docs structure

```
docs/
├── README.md                  ← you are here
├── ARCHITECTURE.md            ← engineering law: module contract, isolation rules, anti-patterns
├── AUDIT.md                   ← defect patterns and the rules they produced
├── DEPLOYMENT.md              ← how to ship
├── MIGRATIONS.md              ← schema change protocol (db push, not migrate dev)
├── SYNC_GUIDE.md              ← how to port Veda fixes via cherry-pick
├── modules/
│   ├── README.md              ← all modules: tier, deps, permissions, status
│   └── packs.md               ← vertical packs: modules, pricing, dashboards
└── prd/
    ├── README.md              ← PRD index with build status and commercial ground truth
    ├── 00-module-system.md
    ├── 01-metering-and-billing.md
    ├── 02-ai-assistant.md
    ├── 03-module-contract.md  ← DEFERRED ~Nov 2026
    ├── 04-franchise-modules.md
    ├── 05-master-data-refinements.md
    └── 06-veda-backports.md
```
