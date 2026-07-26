# Platform Phases — Status

Date: 2026-07-27. Companion to [01_Generalization_Plan.md](01_Generalization_Plan.md).

## Summary

| Phase | Scope | Status |
|---|---|---|
| 0 — Tenancy & RBAC | Org model, RLS, data-driven roles, module gating | **Code complete, migrations unapplied** |
| 1 — Product generalisation | Generic descriptor engine + migration seam | **Engine complete and proven; call-site migration not started** |
| 2 — Module system | Registry, entitlements, guards | **Complete for the gating contract; module extraction not started** |
| 3 — Core services | Workflow engine, automation, DMS, search | **Not started** |
| 4 — Module build-out | Finance, procurement orchestration, CRM, projects | **Not started** |

Phases 0–2 are shipped as code and verified by build, typecheck and tests.
Phases 3–4 are not begun. What follows is what is true, not what was planned.

---

## Phase 0 — done

- `Organization` above `Factory`; Factory is now a site. One Org per existing
  Factory on migration.
- `Role` enum → `SystemRole` (behavioural archetype, closed) plus a new `Role`
  table (permission grants, org-scoped, customisable). 34 files updated.
- Module-contributed permission registry; `lib/permissions.ts` deprecated but
  live, bridged by `LEGACY_KEY_MAP` typed so the two vocabularies cannot drift.
- `ModuleEntitlement` replaces `Factory.modulesEnabled`.
- `provisionTenant()` consolidates three divergent Factory-creation sites.

### Not yet true

**The migrations have not been applied.** There is no local Postgres or Docker
in the dev environment, so the SQL is reviewed but **unexecuted**. Verify it in
a transaction before trusting it:

```bash
psql "$DIRECT_URL" -1 -v ON_ERROR_STOP=1 -f prisma/migrations/20260727010000_platform_tenancy_rbac/migration.sql
```

Run that against a **restored copy** of production, not production. Wrapping in
`BEGIN; … ROLLBACK;` verifies syntax and constraints without persisting.

**RLS ships inert.** `20260727020000_tenant_rls` covers all 80 tables but does
nothing until:

1. the app connects as a **non-owner** role (table owners bypass RLS, so
   applying it while connecting as owner gives false assurance), and
2. every request sets the tenant GUCs via `withTenant()`.

Requirement 2 is the larger job: it means routing tenant-scoped queries through
an interactive transaction, because Supabase's transaction-mode pooler discards
plain `SET`. `src/platform/tenancy/context.ts` provides the primitive; **no call
sites use it yet.**

Until then, tenant isolation remains app-level `factoryId` filtering — i.e. one
forgotten `where` clause from a cross-tenant leak.

### Finding worth acting on

**12 models have no tenant column** — `SalesOrderItem`, `PurchaseOrderItem`,
`BOMItem`, `ProductField`, `BlueprintVersion` and others. They are reachable by
primary key alone, so app-level `factoryId` filtering does not protect them at
all. The generated policies close this via parent containment, which is another
reason RLS is worth finishing rather than deferring.

---

## Phase 1 — engine done, migration not

`src/platform/product/descriptor.ts` renders labels from a per-ProductType
template, scores search per-field by weight, and evaluates visibility rules.

**The open question from the plan is answered.** The plan flagged that the spike
would reveal whether the existing generic field system was adequate or needed
rework. It is adequate: `descriptor.equivalence.test.ts` runs the hardcoded and
generic implementations over **15,552 field combinations** and asserts identical
labels, tokenization, search ranking, and seat-spec visibility. All pass.

`orderFields.ts` is the seam for migrating the ~47 coupled files:

1. Call sites move to the accessor — no behaviour change, legacy columns win.
2. Backfill runs (`20260727030000`) — no behaviour change.
3. `PREFER_DYNAMIC` flips — one line, reversible in seconds.
4. Columns dropped — not reversible, so deliberately last.

**Step 1 has not been done for any of the 47 files.** This is the bulk of the
remaining Phase 1 work and the true critical path.

---

## Phase 2 — gating contract done

13 modules declared, each contributing permissions. Entitlements resolve
dependencies and refuse to disable a module others need. Nav is module-gated,
and `guardModulePage` / `guardModuleAction` enforce server-side — applied to the
procurement and quality surfaces.

Not done: extracting Quality into a genuinely self-contained module, which is
what would prove the API rather than assert it.

---

## Phases 3 and 4 — not started

No workflow engine, automation builder, document management, search
integration, finance module, procurement orchestration, CRM, or projects.

The finance gap remains the most consequential: there is still no `Account`,
`JournalEntry` or `FiscalPeriod` anywhere in the schema, and costing and margin
depend on them.

---

## Recommended next step

Migrate call sites to `readOrderFields` / `writeOrderFields`, starting with the
public verification passport — it is customer-facing, so any divergence is both
most visible and most important to catch early. Then work outward to job cards
and labels.

Do **not** start Phase 3 or 4 first. Building new modules against a schema that
still assumes cars is what the sequencing was designed to avoid.

## Unrelated defect noticed

The root layout lacks `suppressHydrationWarning` on `<html>`, so `next-themes`
produces a hydration mismatch error in the console on every page load. It
predates this work and is a one-line fix, left alone to keep this change set
scoped.
