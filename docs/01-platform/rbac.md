# RBAC And Capability Authorization

Verity authorization is capability-aware.

The backend answer to "can this user do this?" is:

1. Is the user authenticated?
2. Which organization/workspace does the session resolve to?
3. Is the owning module enabled for that organization?
4. Does the user's role grant the required module permission?
5. Does the resource belong to the same tenant/workspace?
6. Does the workflow/subscription state permit the action?

## Current Implementation

| Concern | Path |
| --- | --- |
| Registry permissions | `src/platform/modules/registry.ts` |
| Access resolver | `src/platform/rbac/permissions.ts` |
| Legacy permissions | `src/lib/permissions.ts` |
| Module guards | `src/platform/modules/guard.ts` |
| Subscription write guard | `src/platform/billing/subscription.ts` |

## Legacy State

`src/lib/permissions.ts` still contains legacy VEDA permissions such as `CREATE_ORDER`, `QC_QUEUE`, and `WORKER_JOBS`.

This is a migration bridge, not the target. New modules must define permissions in the module registry. Remaining call sites should migrate to registry-based permissions and `requirePermission`.

## Backend Rules

- Never rely only on UI hiding.
- Never grant access because a user has a broad role name.
- Never accept tenant id from a client as the access boundary.
- Never use pack key as authorization.
- Always check module entitlement before module-owned work.
- Always scope resource queries to the session tenant/workspace.
