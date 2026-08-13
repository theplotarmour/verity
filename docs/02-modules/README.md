# Module Catalog

This folder documents reusable Verity modules.

The current executable registry is `src/platform/modules/registry.ts`. This folder is the human-readable product and implementation spec.

## Module Document Template

Each module document must include:

- purpose,
- status,
- owner,
- dependencies,
- entities,
- permissions,
- navigation,
- routes/pages,
- server actions/APIs,
- workflows,
- events,
- configuration,
- dashboard widgets,
- tenant isolation notes,
- disable/reactivation behavior,
- tests,
- known gaps.

## Current Module Groups

| Group | Modules |
| --- | --- |
| Core | core/team/settings/reports/master-data depending on final Core split |
| Operations | tasks, inspections, maintenance, assets, helpdesk, sites, scheduling |
| People | team, attendance, shifts, leave |
| Commercial | customers, sales/orders, billing, CRM, finance |
| Inventory/Supply | inventory, procurement |
| Manufacturing / VEDA | manufacturing, quality, automotive |
| Restaurant | menu, tables/orders, kitchen, serving |

## Rule

A module document must describe reusable capability behavior. Client deployment details belong under `09-client-implementations`.
