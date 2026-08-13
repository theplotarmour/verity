# Immediate Priorities

Do these before major feature expansion.

## P0: Make Module Disable Real

- map every route/action to an owning module,
- add page guards,
- add action guards,
- test disabled module direct URL access,
- test disabled module server actions,
- verify data retention.

## P0: Prove Blank Tenant

- provision core-only tenant,
- remove default business-module assumptions,
- remove demo data from blank tenant,
- render empty portal/dashboard state,
- block optional routes/actions.

## P0: Dashboard Composition

- add module widget declarations,
- build dashboard resolver,
- replace vertical dashboard switch,
- test two tenants with different widgets.

## P1: Module SDK Pilot

- pick one module,
- create manifest contract,
- route/action/nav/widget/permission ownership,
- build install/disable/permission/tenant-isolation harness.

## P1: VEDA Extraction

- isolate production/floor/QC manufacturing behavior,
- remove manufacturing copy from Core settings,
- classify factory components,
- move reusable pieces into Core or shared UI only when truly domain-neutral.
