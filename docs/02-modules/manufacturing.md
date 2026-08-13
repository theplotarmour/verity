# Manufacturing Module

Status: legacy extraction target.

The Manufacturing module is where VEDA-derived production behavior should live after extraction from Core.

## Owns

- production planning,
- work orders,
- job cards,
- shop-floor routing,
- production labels,
- department stage progression,
- material issue and finished goods receipt when tied to production,
- worker/supervisor floor views.

## Does Not Own

- generic tenant identity,
- global navigation shell,
- module registry,
- generic RBAC,
- generic inventory ledger outside production needs,
- restaurant kitchen workflows,
- service work orders.

## Current Code Candidates

- `src/app/owner/production`
- `src/app/owner/floor`
- `src/app/worker/stage`
- `src/app/supervisor/stage`
- `src/server/actions/production.ts`
- manufacturing portions of `src/server/actions/orders.ts`
- production-specific components under `src/components/factory`

## Required Migration

1. Add module guards to all manufacturing pages and actions.
2. Replace legacy permission checks with registry permissions.
3. Move manufacturing dashboard widgets out of vertical dashboard switch.
4. Keep manufacturing data retained when disabled.
5. Remove manufacturing assumptions from Core settings and provisioning.
