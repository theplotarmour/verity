# VEDA Legacy Context

Verity comes from the VEDA codebase. VEDA was built for a specific manufacturing/automotive workflow. Verity is a general-purpose module platform.

Do not turn VEDA into Verity by renaming tables and screens. The correct migration is extraction:

```text
VEDA Codebase
  Architectural Audit
    Reusable Core
      Verity Core
    Manufacturing Domain
      Manufacturing / VEDA Modules
```

## Reusable Candidates

These may belong in Verity Core or generic modules after review:

- authentication,
- user management,
- roles and permissions,
- organization/workspace tenancy,
- activity logs,
- file uploads,
- notifications,
- configurable forms,
- checklists,
- workflow status primitives,
- dashboard card primitives,
- audit logs,
- PWA infrastructure.

## VEDA-Specific Candidates

These must not define Verity Core:

- production order logic,
- factory-specific QC,
- vehicle seat-cover product assumptions,
- automotive seed data,
- manufacturing workflow stages,
- shop-floor routing,
- CAD/Cutting/Stitching/Packing terminology,
- stock production vs on-ordered production,
- Carxen-specific catalog behavior.

## Current Repo Reality

The current implementation still contains many VEDA-derived concepts:

- `Factory` remains the central workspace model.
- Many tables are `factoryId` scoped.
- Production, floor, QC, inventory, and order-taking pages exist under `/owner`.
- Some legacy routes and server actions do not yet have module entitlement guards.
- The dashboard still switches by vertical pack/industry.

These are migration facts, not target architecture.

## Migration Rule

Before editing VEDA-derived code, classify the touched behavior as:

1. Core platform,
2. reusable horizontal module,
3. manufacturing/automotive module,
4. restaurant/service module,
5. technical debt.

If a component assumes production stages, QC floor, automotive fitment, or factory departments, it does not belong in Core.
