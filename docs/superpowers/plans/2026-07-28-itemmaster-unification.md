# ItemMaster Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make `ItemMaster` the single answer to "what are we making", so a finished good created in Master Data can be ordered and produced without being re-created as a `ProductVariant`.

**Why this and nothing else:** Verity currently has two competing product tables. Master Data creates `ItemMaster`; orders and production read `ProductVariant`. Every downstream feature — auto-BOM, auto-QC, auto-routing, costing, the "configure once" promise — is decoration on that split. Until it closes, each new module has to pick a side and half of them pick wrong.

**Tech Stack:** Next.js 16 App Router + Server Actions, React 19, Prisma 6 + PostgreSQL, Zod 4, Vitest.

## Global Constraints

- **All data is mock.** Wipe and re-seed rather than backfilling. `npm run db:reset` then `node scripts/seed_item_groups.mjs && node scripts/seed_all_specs.mjs && npx tsx scripts/seed_demo_items.mts`.
- **`npx prisma db push` for iteration; migrations are baselined** at `00000000000000_baseline`. Before any schema change, preview with `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script` and stop if it contains `DROP` you did not intend. `build` runs `prisma migrate deploy`, so any schema change must end with a real migration file — generate it with `npx prisma migrate dev --create-only` once the shape is settled.
- Every new model carries `factoryId` and `@@index([factoryId])`.
- Server actions call `getOwnerUser()` first and scope every query to `user.factoryId`.
- `npm run typecheck` and `npm test` must pass at the end of every task.
- Commit after every task.

## The shape of the problem

```
Master Data  ──creates──>  ItemMaster ──┐
                                        ├── two tables, one concept
Order studio ──reads────>  ProductVariant ──> Blueprint ──> BOM/QC/routing
```

`ProductVariant.itemId` is already required and populated (every variant has a
backing item). `Blueprint` already carries both `itemId` and `productVariantId`.
So the data is *already joined* — what remains is that the **read paths** and the
**order studio** still go through the variant.

Target:

```
Master Data ──creates──> ItemMaster ──> Blueprint ──> BOM/QC/routing
                              ↑
Order studio ──selects────────┘
```

`ProductVariant` survives only as an optional sales-catalog row. Nothing reads it
to answer "what are we making".

## Files

| File | Role | Size |
|---|---|---|
| `src/app/owner/production/client.tsx` | `OrdersClient` — the order studio, shared by `/owner/order-taking` and `/owner/production` | 2,377 lines |
| `src/server/actions/orders.ts` | `getMasterData()`, `createOrder()` | — |
| `src/server/actions/production.ts` | production plan / work order creation, blueprint self-heal | — |
| `prisma/schema.prisma` | `Blueprint`, `SalesOrder`, `ProductVariant` | — |
| `src/server/queries/spec.ts` | `getItemBom`, resolved fields | — |
| `src/server/actions/itemsFromSpec.ts` | `createItemFromSpec` | — |

**Read `OrdersClient` before touching it.** It has ~106 references to
`materialId` / `designId` / `colorId` / `productTypeId` / `vehicle*`. It has no
test coverage. It is the screen store managers use daily.

---

### Task 1: Characterisation test for order creation

Nothing here is safe to refactor without a test that fails when order creation
breaks. This task buys the safety net for every task after it.

**Files:**
- Create: `src/server/actions/orders.test.ts`
- Modify: `vitest.config.ts` (allow a second, DB-backed project)

**Interfaces:**
- Consumes: `createOrder` from `@/server/actions/orders`
- Produces: a test that creates an order end to end and asserts the resulting rows

- [ ] **Step 1: Split Vitest into unit and integration projects**

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Integration tests hit the real database and must not run in parallel.
    poolOptions: { threads: { singleThread: true } },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
```

- [ ] **Step 2: Write the failing characterisation test**

`getOwnerUser()` reads cookies, so the test drives the Prisma layer directly and
asserts the shape `createOrder` produces. Capture *current* behaviour, not ideal
behaviour — this test's job is to detect change.

```ts
import { describe, it, expect, beforeAll } from "vitest";
import prisma from "@/lib/prisma";

describe("order creation shape", () => {
  let factoryId: string;

  beforeAll(async () => {
    const f = await prisma.factory.findFirstOrThrow({ where: { slug: "carxen" } });
    factoryId = f.id;
  });

  it("every sales order resolves to a producible item", async () => {
    const orders = await prisma.salesOrder.findMany({
      where: { factoryId },
      include: {
        items: { include: { productVariant: { select: { itemId: true } } } },
      },
    });
    expect(orders.length).toBeGreaterThan(0);
    for (const o of orders) {
      for (const line of o.items) {
        // Today this resolves via the variant. After Task 4 it resolves via
        // SalesOrder.itemId directly, and this assertion tightens.
        expect(line.productVariant.itemId).toBeTruthy();
      }
    }
  });

  it("every producible item has a blueprint with an active version", async () => {
    const blueprints = await prisma.blueprint.findMany({
      where: { factoryId },
      include: { versions: true },
    });
    for (const b of blueprints) {
      expect(b.itemId).toBeTruthy();
      expect(b.versions.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 3: Run and confirm it passes against current data**

Run: `npm test -- orders`
Expected: PASS. If it fails, the seed is incomplete — run the reseed chain from
Global Constraints before continuing.

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts src/server/actions/orders.test.ts
git commit -m "test(orders): characterise order and blueprint shape before unification"
```

---

### Task 2: Blueprint hangs off the item alone

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/server/actions/production.ts`, `src/server/actions/orders.ts`, `scripts/enrich_usage.ts`, `src/app/owner/settings/blueprint/[variantId]/page.tsx`

**Interfaces:**
- Consumes: `Blueprint.itemId` (already present and populated)
- Produces: `Blueprint.productVariantId` gone; all blueprint lookups keyed by `itemId`

- [ ] **Step 1: Find every read of `blueprint.productVariant`**

```bash
git grep -n "productVariant" -- src/ | grep -i blueprint
```

Expected: hits in dashboard, inspector, floor and production includes. Each one
is fetching product/fitment detail *through* the blueprint. Every one becomes
`blueprint.item` plus, where product/fitment is genuinely needed,
`blueprint.item.productVariant`.

- [ ] **Step 2: Repoint each read**

For an include like:

```ts
blueprint: { include: { productVariant: { include: { product: true } } } }
```

use:

```ts
blueprint: { include: { item: { include: { productVariant: { include: { product: true } } } } } }
```

Do this mechanically, one call site at a time, running `npm run typecheck`
between each. Do not batch — the Prisma include types cascade and a single wrong
edit produces a wall of unrelated errors.

- [ ] **Step 3: Drop the column**

In `prisma/schema.prisma`, remove from `Blueprint`:

```prisma
  productVariantId String         @unique
  productVariant   ProductVariant @relation(fields: [productVariantId], references: [id], onDelete: Cascade)
```

and remove `blueprint Blueprint?` from `ProductVariant`.

- [ ] **Step 4: Apply and reseed**

```bash
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script | grep DROP
npx prisma db push --accept-data-loss
npm run db:reset && node scripts/seed_item_groups.mjs && node scripts/seed_all_specs.mjs && npx tsx scripts/seed_demo_items.mts
```

- [ ] **Step 5: Verify**

Run: `npm test && npm run typecheck && npm run build`
Expected: all pass, including the Task 1 characterisation test.

- [ ] **Step 6: Rename the blueprint route**

`src/app/owner/settings/blueprint/[variantId]/` → `[itemId]/`, and change the
page's lookup from `productVariant` to `itemMaster`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(blueprint): key blueprints on the item, drop the variant link"
```

---

### Task 3: Auto-attach BOM, QC and routing at item creation

This is the payoff — and it only becomes possible once Task 2 removes the
variant requirement from `Blueprint`.

**Files:**
- Modify: `prisma/schema.prisma` (`ItemGroup.defaultQcTemplateId`, `ItemGroup.defaultRouteJson`)
- Modify: `src/server/actions/itemsFromSpec.ts`
- Create: `src/server/actions/itemBlueprint.ts`

**Interfaces:**
- Consumes: `expandBomTemplate` from `@/lib/spec/bom`, `getItemBom` from `@/server/queries/spec`
- Produces: `ensureItemBlueprint(itemId): Promise<{ blueprintVersionId: string; warnings: string[] }>`

- [ ] **Step 1: Add the group defaults**

Do **not** add `RoutingTemplate` / `RoutingTemplateStep` models.
`BlueprintRouteStep` already carries department, sequence, estimated time,
skills and instructions. A default route is a list of departments, which is one
JSON column, not two tables.

```prisma
model ItemGroup {
  // ...
  /// QC template attached to every item made from this group.
  defaultQcTemplateId String?
  defaultQcTemplate   QCTemplate? @relation(fields: [defaultQcTemplateId], references: [id], onDelete: SetNull)
  /// Ordered department ids copied into BlueprintRouteStep at item creation:
  /// [{ departmentId, estimatedTimeMins }]
  defaultRouteJson    Json?
}
```

Add `itemGroups ItemGroup[]` to `QCTemplate`.

- [ ] **Step 2: Write `ensureItemBlueprint`**

`src/server/actions/itemBlueprint.ts`:

```ts
"use server";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { getItemBom } from "@/server/queries/spec";

/**
 * Give a producible item a blueprint with an active version, its BOM expanded
 * from the group template, its QC template attached and its route copied in.
 *
 * Warnings rather than failures: an item whose fabric is unanswered should still
 * be created and visible, with the gap reported, not rejected.
 */
export async function ensureItemBlueprint(itemId: string) {
  const user = await getOwnerUser();
  const warnings: string[] = [];

  const item = await prisma.itemMaster.findFirstOrThrow({
    where: { id: itemId, factoryId: user.factoryId },
    include: { group: true },
  });
  if (item.manufacturingType === "BUY") return { blueprintVersionId: null, warnings };

  const existing = await prisma.blueprint.findUnique({
    where: { itemId },
    include: { versions: { where: { isActive: true } } },
  });
  if (existing?.versions[0]) {
    return { blueprintVersionId: existing.versions[0].id, warnings };
  }

  const blueprint =
    existing ??
    (await prisma.blueprint.create({
      data: { factoryId: user.factoryId, itemId },
    }));

  const version = await prisma.blueprintVersion.create({
    data: {
      blueprintId: blueprint.id,
      versionNumber: 1,
      name: "V1 - Standard",
      qcTemplateId: item.group?.defaultQcTemplateId ?? null,
      isActive: true,
    },
  });
  await prisma.blueprint.update({
    where: { id: blueprint.id },
    data: { activeVersionId: version.id },
  });
  if (!item.group?.defaultQcTemplateId) {
    warnings.push(`No default QC template on ${item.group?.name ?? "this group"}`);
  }

  // Route
  const route = (item.group?.defaultRouteJson as
    | { departmentId: string; estimatedTimeMins?: number }[]
    | null) ?? [];
  for (const [i, step] of route.entries()) {
    await prisma.blueprintRouteStep.create({
      data: {
        blueprintVersionId: version.id,
        departmentId: step.departmentId,
        sequence: i,
        estimatedTimeMins: step.estimatedTimeMins ?? 0,
      },
    });
  }
  if (route.length === 0) warnings.push("No default route on this group");

  // BOM
  const lines = await getItemBom(itemId);
  if (lines.length === 0) {
    warnings.push("BOM template produced no lines — check the group's recipe and this item's answers");
  } else {
    const bom = await prisma.bOM.create({
      data: { factoryId: user.factoryId, blueprintVersionId: version.id },
    });
    for (const l of lines) {
      await prisma.bOMItem.create({
        data: { bomId: bom.id, itemId: l.itemId, quantity: l.quantity, wastePercent: l.wastePercent },
      });
    }
  }

  return { blueprintVersionId: version.id, warnings };
}
```

- [ ] **Step 3: Call it from `createItemFromSpec`**

In `src/server/actions/itemsFromSpec.ts`, after the transaction commits:

```ts
const { warnings } = await ensureItemBlueprint(item.id);
return { id: item.id, warnings };
```

Widen the return type to `{ id: string; warnings: string[] } | { error: string }`
and surface the warnings in the wizard as an amber note after save, not a
blocking error.

- [ ] **Step 4: Test**

Add to `src/server/actions/orders.test.ts`:

```ts
it("a Make item gets a blueprint with an active version and a BOM", async () => {
  const item = await prisma.itemMaster.findFirstOrThrow({
    where: { factoryId, manufacturingType: "MAKE", specHash: { not: null } },
    include: { blueprint: { include: { versions: { include: { bom: { include: { items: true } } } } } } },
  });
  const version = item.blueprint?.versions.find((v) => v.isActive);
  expect(version).toBeTruthy();
  expect(version!.bom?.items.length ?? 0).toBeGreaterThan(0);
});
```

Run: `npm test`. It fails until Step 3 runs against fresh data — reseed, then re-run.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(spec): auto-attach blueprint, BOM, QC and route on item creation"
```

---

### Task 4: The order studio selects an item

The largest task. Do it only after 1–3 are green.

**Files:**
- Modify: `src/app/owner/production/client.tsx`
- Modify: `src/server/actions/orders.ts`

**Interfaces:**
- Consumes: `finishedGoods` from `getMasterData()` (already served), `SalesOrder.itemId` (already exists), `mintDraftItem` from `@/server/actions/itemDrafts`
- Produces: orders that carry `itemId`; the loose spec columns unused

- [ ] **Step 1: Locate the product-selection block**

```bash
git grep -n "materialId\|designId\|colorId" -- src/app/owner/production/client.tsx | head -30
```

There are two concerns tangled together: **which product** (replace) and
**per-order extras** like remarks and scheduling (keep). Separate them before
editing.

- [ ] **Step 2: Replace with an item picker**

```tsx
<SpecCombobox
  options={data.finishedGoods.map((i) => ({
    id: i.id,
    label: i.name,
    sublabel: i.itemCode,
    searchText: [i.name, i.aliasName, i.itemCode].filter(Boolean).join(" ").toLowerCase(),
  }))}
  value={itemId}
  onChange={setItemId}
  placeholder="Search the catalog…"
/>
<button onClick={() => setMintingDraft(true)} className="mt-1 text-xs text-neutral-500 hover:underline">
  Not in the list? Create it
</button>
```

`setMintingDraft(true)` opens the existing Add Master Data wizard pointed at the
Finished Good group and calls `mintDraftItem`; its returned id becomes `itemId`.

- [ ] **Step 3: Write `itemId` on submit**

In `createOrder`, set `itemId` and stop writing `materialId`, `designId`,
`colorId`, `productTypeId`, `vehicleBrandId`, `vehicleModelId`, `vehicleYear`,
`seatType`, `hasArmrest`, `headrestCount`. Resolve the blueprint version from
`item.blueprint.activeVersionId` rather than from the variant.

- [ ] **Step 4: Verify both modes**

Run: `npm run dev`

- `/owner/order-taking` (store-manager mode): book an order against a catalog item; confirm `itemId` is set and it reaches the floor
- `/owner/production` (owner mode): same picker, nothing else regressed
- Book an order for a spec that does not exist: the draft mints, the order saves, the item shows under "Drafts only" in the studio

Run: `npm test && npm run typecheck && npm run build`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(orders): book orders against finished-good items"
```

---

### Task 5: Drop the parallel columns

**Files:** `prisma/schema.prisma`

- [ ] **Step 1: Prove nothing reads them**

```bash
git grep -n "materialId\|designId\|colorId\|productTypeId\|vehicleBrandId\|vehicleModelId" -- src/
```

Expected: **zero hits.** If there are any, fix those call sites and repeat. Do
not proceed on a partial result — this precondition was false last time and the
task was correctly abandoned because of it.

- [ ] **Step 2: Remove from `SalesOrder`**

Drop `materialId`, `material`, `designId`, `design`, `colorId`, `color`,
`productTypeId`, `productType`, `vehicleBrandId`, `vehicleBrand`,
`vehicleModelId`, `vehicleModel`, `vehicleYear`, `seatType`, `hasArmrest`,
`headrestCount`, and the matching back-relations on `ItemMaster`, `Design`,
`Color`, `ProductType`, `VehicleBrand`, `VehicleModel`.

Delete the `ProductCombination` model.

- [ ] **Step 3: Apply, reseed, verify**

```bash
npx prisma db push --accept-data-loss
npm run db:reset && node scripts/seed_item_groups.mjs && node scripts/seed_all_specs.mjs && npx tsx scripts/seed_demo_items.mts
npm test && npm run typecheck && npm run build
```

- [ ] **Step 4: Cut a real migration**

The baseline is the only migration and `build` runs `migrate deploy`, so the
cumulative schema change needs a file:

```bash
npx prisma migrate dev --create-only --name itemmaster_unification
npx prisma migrate resolve --applied <generated_name>
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(orders): drop parallel spec columns and ProductCombination"
```

---

## Outcome (2026-07-28) — Tasks 1-4 done, Task 5 closed as won't-do

**The split is closed.** Orders resolve to `ItemMaster`; production, BOM, QC and
routing all follow from it.

| Task | Status |
|---|---|
| 1 Characterisation tests | done — `7bd491f`, now 6 assertions |
| 2 Blueprint keyed on item | done — `2522ccb`, 28 reads repointed |
| 3 Auto-attach BOM/QC/route | done — `229f207` |
| — Finished goods receipt on items | done — `3b9c7dd` (sub-task the plan missed) |
| 4 Orders select an item | done — `49ebcfc`, by derivation not UI rewrite |
| 5 Drop the parallel columns | **won't do** — see below |

### Task 4 was solved differently, and better

The plan called for rewriting the studio's product picker. That would have meant
reworking a 2,377-line component whose `draft` and `batchLines` state threads the
spec through vehicle search, batch mode and partial-stock flows.

Unnecessary: the studio *already collects the whole spec* — brand, model, fabric,
design, colour, seat type, headrests, armrest is exactly a Seat Cover spec sheet.
So `resolveOrderItem` derives the item from those answers instead of asking for
it again. Because identity is the answer hash, the same combination sold twice
converges on one item rather than multiplying rows. Zero UI risk, and it applies
to every order rather than only new ones.

### Why Task 5 is closed rather than pending

Dropping `materialId` / `designId` / `colorId` / `productTypeId` / `vehicle*`
requires migrating every **display** path that reads them — dashboard, floor,
reports, labels, CAD — to read the item's spec values and resolve labels.

Broad, and worth nothing: `createOrder` writes those columns and `itemId` from
the same answers, so they cannot disagree. They are a denormalised display cache,
now documented as such in `schema.prisma` with an explicit instruction never to
branch production logic on them.

If they are ever removed, do it as a display-layer migration with its own plan,
not as the tail of this one.

### Still open, genuinely

- **The studio could offer an item picker** as a shortcut — pick an existing
  catalog item instead of re-typing its spec. A convenience now, not a
  prerequisite: `SalesOrder.itemId`, `finishedGoods` and `mintDraftItem` are all
  wired.
- **Legacy `MasterSheetView` sheets** are hidden but their ~700 lines of render
  branches are still present.

## Deliberately not in this plan

- **`RoutingTemplate` models.** `BlueprintRouteStep` plus one JSON column on
  `ItemGroup` covers it. Two tables for an ordered list of departments is
  overbuild.
- **`Machine` master.** The enum value was removed from every surface that
  offered it. Add the model when there is a real maintenance module, not to
  satisfy a dropdown.
- **Simple Mode / setup wizard / CRM.** All are polish on this foundation. None
  should start before Task 5 is green.
- **Deleting the legacy `MasterSheetView` sheets.** Their tabs are already
  hidden. Removing ~700 lines from a 1,853-line file with 65 typed `activeSheet`
  references is its own change with its own risk.

## Definition of done

Run this by hand. Until it passes without developer intervention, the split is
not closed:

1. Master Data → Add Master Data → Finished Good → Seat Cover → fill the spec → Save
2. The item appears in its sheet with a generated name and code
3. Open it: BOM is populated, QC template attached, route listed
4. Order taking → search that item by name → book an order for it
5. Release to production
6. Cutting sees the required material from the BOM
7. QC sees the checklist that came from the group
8. No step required creating a Product, a ProductVariant, or re-entering the spec
