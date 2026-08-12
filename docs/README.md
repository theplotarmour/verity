# Verity Docs

Start here. Three reading paths depending on what you need.

---

## I'm new — orient me

1. **[Module reference](./modules/README.md)** — all 16 modules: what each does, what tier it is, what it requires, what permissions it contributes.
2. **[Pack reference](./modules/packs.md)** — the four vertical packs, which modules they include, pricing, and what a tenant actually sees on their dashboard.
3. **[Architecture overview](./verity_service_modules_spec.md)** — the full system design (long, read after the above).

---

## I'm building a feature

- **[PRD index](./prd/README.md)** — what to build, in what order, and how you'll know it worked.
- **[Sync guide](./SYNC_GUIDE.md)** — how to port a fix from Veda into Verity (cherry-pick standard, no copy-paste).
- **[Audit log](./AUDIT.md)** — recurring defect patterns in this codebase and why each rule exists. Read before touching auth, billing, or permissions.
- **[Migrations](./MIGRATIONS.md)** — use `db push`, never `migrate dev`. Read before changing the schema; the wrong command here drops the database.

---

## I'm deploying

- **[Deployment guide](./DEPLOYMENT.md)**

---

## Docs structure

```
docs/
├── README.md                  ← you are here
├── AUDIT.md                   ← defect patterns and the rules they produced
├── DEPLOYMENT.md              ← how to ship
├── SYNC_GUIDE.md              ← how to port Veda fixes
├── verity_service_modules_spec.md  ← full architecture doc
├── modules/
│   ├── README.md              ← module reference (all 16 modules, tiers, deps)
│   └── packs.md               ← pack reference (4 verticals, pricing, dashboards)
└── prd/
    ├── README.md              ← PRD index with build status
    ├── 00-module-system.md
    ├── 01-metering-and-billing.md
    ├── 02-ai-assistant.md
    ├── 03-module-contract.md  ← DEFERRED ~Nov 2026
    ├── 04-franchise-modules.md
    ├── 05-master-data-refinements.md
    └── 06-veda-backports.md
```
