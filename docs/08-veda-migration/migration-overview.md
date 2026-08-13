# VEDA To Verity Migration

VEDA is the source legacy application. Verity is the platform target.

The migration must extract reusable infrastructure and isolate manufacturing/automotive logic into modules.

## Migration Map

| Current area | Classification | Target |
| --- | --- | --- |
| Auth/session | Reusable Core | Verity Core |
| Organization/workspace tenancy | Reusable Core with terminology cleanup | Verity Core |
| Roles/permissions | Reusable Core, currently mixed with legacy permissions | Verity RBAC |
| Notifications/audit | Reusable Core | Verity Core |
| Production pages | VEDA domain | Manufacturing module |
| Floor/stage flows | VEDA domain | Manufacturing module |
| QC floor where tied to production | VEDA domain / reusable quality split needed | Manufacturing + Quality modules |
| Automotive catalog/fitment | VEDA/vertical domain | Automotive module |
| Inventory ledger | Reusable module, currently manufacturing-influenced | Inventory module |
| Purchase/vendor flows | Reusable module | Procurement module |
| Restaurant dining flows | Reusable vertical modules | Menu, Tables/Orders, Kitchen, Serving |

## Phase 1: Make Module Disable Real

1. Add `guardModulePage` to optional module routes.
2. Add `guardModuleAction` / `guardModuleWrite` to optional module actions.
3. Add disabled-module tests.
4. Keep data retained.

## Phase 2: Prove Blank Tenant

1. Provision core-only tenant.
2. No domain seed data.
3. Empty portal state.
4. Optional module URLs/actions blocked.

## Phase 3: Dashboard Composition

Replace industry/pack dashboard switch with module-contributed widgets.

## Phase 4: Module SDK Pilot

Pick one newer module such as helpdesk, assets, or projects and move it toward the full module contract.

## Phase 5: Manufacturing Extraction

Treat production/QC/floor/order-taking as a manufacturing module unless a part is proven generic.

## Deprecated Patterns

- `factory.industry` switch as product architecture.
- Auto-components dashboard fallback for unknown tenants.
- `CREATE_ORDER` as a universal permission for unrelated modules.
- Carxen/automotive seeds in blank tenants.
- Shared shell edits for module navigation.
