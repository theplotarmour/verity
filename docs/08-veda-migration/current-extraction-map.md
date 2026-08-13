# Current Extraction Map

This map should be updated as code moves.

## Core Candidate

| Area | Current path | Notes |
| --- | --- | --- |
| Module registry | `src/platform/modules` | Already platform-level |
| Tenancy provisioning | `src/platform/tenancy` | Must support blank tenant |
| RBAC resolver | `src/platform/rbac` | Legacy permission bridge remains |
| Owner shell | `src/components/layout/owner-shell.tsx` | Must stay module-driven |

## Manufacturing Module Candidate

| Area | Current path | Notes |
| --- | --- | --- |
| Production board | `src/app/owner/production` | Needs entitlement page guard |
| Floor board | `src/app/owner/floor` | Needs entitlement page guard |
| Worker stage | `src/app/worker/stage` | Manufacturing/workflow surface |
| Supervisor stage | `src/app/supervisor/stage` | Manufacturing/workflow surface |
| Production actions | `src/server/actions/production.ts` | Needs entitlement action guards |
| Factory components | `src/components/factory` | Split reusable UI from manufacturing UI |

## Quality Split Candidate

Quality should be separated into:

- generic inspections/checklists/evidence,
- production QC bound to manufacturing job cards.

Until split, quality routes/actions must still be guarded.

## Restaurant Module Candidate

| Area | Current path | Notes |
| --- | --- | --- |
| Kitchen page/actions | `src/app/owner/kitchen`, `src/server/actions/kitchen.ts` | Guarding already started |
| Serving page/actions | `src/app/owner/serving`, `src/server/actions/serving.ts` | Guarding already started |
| Dining orders | `src/server/actions/diningOrders.ts` | Must stay `tables_orders` gated |
| Menu | `src/server/actions/menu.ts` | Must stay `menu` gated |
