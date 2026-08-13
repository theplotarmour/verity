# Phase 4 — Permission Backfill (awaiting approval)

Date: 2026-08-13
Status: **written, not run. No database writes have occurred.**

Matrix: [`src/platform/rbac/legacy-backfill.ts`](../src/platform/rbac/legacy-backfill.ts)
Script: [`scripts/backfill-role-permissions.ts`](../scripts/backfill-role-permissions.ts)

```bash
npx tsx scripts/backfill-role-permissions.ts
```

Dry run is the default. `--apply` is the only thing that writes.

---

## Why this exists

Phase 4 deletes gate 3 from `resolveNavItems` — the legacy `can(item.permission)`
check. Once it is gone, every nav item must gate on a registry permission.

Today **no role in any organisation holds** `stock.view`, `item.view`,
`work_order.create`, `production.supervise`, `quality.queue`,
`purchase_order.create` or `dispatch.record`. Those pages are reachable only
because the legacy union answers `CREATE_ORDER` or `QC_QUEUE`.

Delete gate 3 without this backfill and **every owner in every tenant silently
loses Inventory, Production, Floor, QC Floor, Purchase and Logistics.** Adding
`requires` to those nav items does the same thing, because gate 2 then applies.

One thing simplifies it: **no factory has a stored permission override.** Every
tenant runs on `DEFAULT_ROLE_PERMISSIONS`, so there are no bespoke matrices to
preserve.

---

## Why the obvious mapping was wrong

The first version of this — "grant each role the registry keys for everything its
legacy permission unlocks" — was a privilege escalation.

`STORE_MANAGER` holds `CREATE_ORDER`. Uniform expansion gave it
`purchase_order.create`, `dispatch.record` and `work_order.create`. But
`STORE_MANAGER_ALLOWED` confines that role to order-taking, dashboard and
inventory — and **that carve-out is a nav restriction, not a permission one.** The
links are hidden; the capability would have been real against every action guarded
on those keys. `releaseDrafts` already gates releasing to production on
manager/owner, so the grant would also have contradicted a rule enforced elsewhere.

`CREATE_ORDER` was never one permission. It gates twelve destinations — which is
the lie Phase 4 exists to remove, and also why there is no mechanical equivalence
to migrate. The matrix is written per role, deliberately.

**Rule applied throughout: migration preserves reach, it does not promote.**

---

## Scale

260 rows, 30 roles, 5 organisations. Same matrix applied to every organisation —
no org ids in the script, no per-tenant branches.

| Role | Roles | Rows | New keys per role |
| --- | --- | --- | --- |
| OWNER | 5 | 95 | 19 |
| CO_OWNER | 5 | 75 | 15 |
| MANAGER | 5 | 55 | 11 |
| SUPERVISOR | 5 | 16 | 2 |
| STORE_MANAGER | 5 | 15 | 3 |
| WORKER | 5 | 4 | 0–1 |

Per organisation: 54, 52, 52, 52, 50. The spread is only because some
organisations already hold a few of the keys.

---

## Before and after, per role

Counts are the union across organisations; the per-org add count is the third
column of the table above.

### OWNER — 43 → 62

```
bom.manage, bom.view, dispatch.record, item.manage, item.view,
production.jobs, production.supervise, purchase_order.approve,
purchase_order.create, purchase_receipt.record, quality.approve,
quality.inspect, quality.queue, stock.adjust, stock.view, supplier.manage,
warehouse.manage, work_order.create, work_order.release
```

### CO_OWNER — 35 → 50

```
billing.access, bom.view, dispatch.record, item.view, org.transfer_ownership,
production.jobs, production.supervise, purchase_order.create,
purchase_receipt.record, quality.inspect, quality.queue, stock.adjust,
stock.view, work_order.create, work_order.release
```

### MANAGER — 33 → 44

```
bom.view, dispatch.record, item.view, production.supervise,
purchase_order.create, purchase_receipt.record, quality.queue, stock.view,
team.assign_roles, work_order.create, work_order.release
```

### SUPERVISOR — 21 → 23

```
production.jobs, team.manage
```

Nothing in sales or procurement, as agreed.

### WORKER — 8 → 8

No change. `production.jobs` is the whole legacy set and it is already held.

### STORE_MANAGER — 3 → 6

```
customer.manage, item.view, stock.view
```

Read-only additions, scoped to the nav carve-out. It needs to see what is on the
shelf to book against it.

---

## Deliberately withheld

Recorded in `WITHHELD` in the matrix file, so the next person to widen a role sees
why it is narrow first.

| Role | Key | Why not |
| --- | --- | --- |
| STORE_MANAGER | `purchase_order.create` | Hidden by the nav carve-out today; granting turns a hidden link into a capability |
| STORE_MANAGER | `dispatch.record` | Same |
| STORE_MANAGER | `work_order.create` | `releaseDrafts` already gates this on manager/owner |
| SUPERVISOR | `sales_order.create` | Not in its legacy set; adding it widens the role during a migration |
| MANAGER | `settings.access` | Not in the legacy manager default |
| WORKER | `dashboard.view` | Workers land on `/worker`, not the owner dashboard |

---

## Three calls I want your eyes on

These are where "what does this role reach today" has more than one defensible
answer, because the legacy permission was doing two jobs.

**1. MANAGER → `purchase_order.create`, `purchase_receipt.record`**

Manager holds `CREATE_ORDER`, which shows `/owner/purchase` today. Should a manager
*raise* purchase orders, or only view them? There is no `purchase_order.view` in
the registry, so "view only" is not currently expressible — granting create is the
only way to keep the page reachable.

**2. CO_OWNER → owner-equivalent**

`DEFAULT_ROLE_PERMISSIONS` gives co-owner all fifteen legacy permissions, identical
to owner, so this matrix mirrors that. Confirm that equality is intended and not an
old oversight — this backfill would make it explicit and harder to walk back.

**3. SUPERVISOR → `team.manage`**

Supervisor holds `MANAGE_TEAM` today, which shows `/owner/team` and
`/owner/departments`. Is that intended, or was `MANAGE_TEAM` being read as "manage
my department's roster"? The registry has no department-scoped equivalent.

---

## Safety properties

- **Additive only.** `createMany({ skipDuplicates: true })`. Re-running is inert,
  and a tenant's hand-added grants on a built-in role are never removed.
- **Reversible.** Undo is deleting the inserted `RolePermission` rows.
- **No effective widening on day one.** Every key granted corresponds to something
  the role can already reach — with the three ambiguities above as the honest
  exceptions.
- **Entitlement still filters.** `resolveAccess` drops any permission whose module
  the organisation is not entitled to, so `stock.view` on a restaurant's owner is
  inert until they buy `inventory`.
- **Blind to tenant content.** No org ids, department names, people or team
  structure anywhere in the script.

---

## Sequence once approved

1. Run with `--apply`.
2. Add `requires` to the 14 nav items that have none.
3. Delete gate 3 from `resolveNavItems`.
4. Delete `src/lib/permissions.ts` and the `Permission` union.
5. Migrate the remaining `can(...)` call sites (8 files import the legacy module).

Steps 2–5 are mechanical and land in one commit with the guard tests already in
place. Step 1 is the only one that touches data.
