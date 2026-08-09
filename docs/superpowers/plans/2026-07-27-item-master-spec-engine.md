# Item Master & Spec Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Verity's hardcoded master-data screens with a spec-driven item master where the factory owner defines item groups, their fields, and their naming rules — and items, codes, and bills of materials are generated from those definitions.

**Architecture:** An `ItemGroup` tree carries `SpecField` definitions that are inherited down the tree. Fields are Value, Option, or Reference; a Reference field's options are the rows of another group or attribute master, which makes the item master a navigable graph. Item names and codes are rendered from per-group templates over the field answers, and the hash of those answers is the item's identity. The Master Data Studio's twelve hardcoded tabs become rows in `ItemGroup`, rendered by one field-driven sheet component with a Configure mode and a Data mode.

**Tech Stack:** Next.js 16 (App Router, Server Actions), React 19, TypeScript 5, Prisma 6 + PostgreSQL, Zod 4, Papaparse 5, Tailwind 4. Vitest is added by Task 1 — it does not exist yet.

**Design spec:** `docs/superpowers/specs/2026-07-27-item-master-spec-engine-design.md`. Read it before starting. This plan implements it.

---

## Context for a fresh agent

You are working in `D:\Code\verity`, branch `updates`. You have not seen this codebase. Read this section before Task 1.

**What Verity is.** A multi-tenant factory operations platform ("Factory OS"). One deployment serves many factories; every table carries `factoryId` and every query must scope by it. The pilot client is Carxen, an Indian seat-cover manufacturer.

**Conventions you must follow:**

| Thing | Convention |
|---|---|
| Import alias | `@/*` → `src/*` |
| Prisma client | `import prisma from "@/lib/prisma"` — default export, singleton, pooled. Never `new PrismaClient()` |
| Server actions | `"use server"` at the top of the file, in `src/server/actions/`. Only async exports allowed — constants go in `src/lib/*-constants.ts` |
| Auth in owner actions | `const user = await getOwnerUser()` from `@/lib/server/owner`. It redirects on failure and returns a `User` with `factoryId` |
| Tenant scoping | Every `create` sets `factoryId: user.factoryId`. Every `findMany`/`update`/`delete` filters on it. No exceptions |
| Cache busting | Call `revalidateMasterPaths()` after mutations — see `src/server/actions/masterData.ts:14` |
| Safe deletes | `guardDelete("label", () => prisma.x.delete(...))` from `@/lib/server/prisma-errors` turns FK violations into `{ error }` instead of a crash |
| Styling | Tailwind 4 plus the tokens in `src/design-system/`. UI primitives live in `src/components/ui/` |
| Schema changes | Edit `prisma/schema.prisma`, then `npx prisma db push`. **Do not use `prisma migrate dev`** — see the warning below |

**Files you will spend the most time in:**

- `prisma/schema.prisma` (1,392 lines) — the whole data model
- `src/app/owner/settings/MasterSheetView.tsx` (1,853 lines) — the twelve hardcoded tabs. This file shrinks dramatically
- `src/server/actions/masterData.ts` (1,334 lines) — ~40 bespoke add/remove actions, one pair per entity. Most are deleted
- `src/lib/item-constants.ts` — `ITEM_TYPE_LABELS`, `ITEM_TYPE_ORDER`, `UOM_SUGGESTIONS`

**Database warning — read before any schema change.**

`DATABASE_URL` points at a **hosted Supabase instance**, not a local dev
database. Two consequences:

1. **Never run `prisma migrate dev`.** Migration history is out of sync — the
   database has `20260727010000_platform_tenancy_rbac` applied while
   `prisma/migrations/` contains only `0_init`, and there is live drift on
   `VehicleGeneration`. `migrate dev` responds by demanding a full reset of the
   hosted database. Use `npx prisma db push`, which is what this project's own
   `db:sync` script does. Additive changes apply cleanly.
2. **`npm run db:reset` drops every table on that hosted instance.** Several
   tasks below call for it. Get explicit human approval each time, or point
   `DATABASE_URL` at a local Postgres first. Do not run it unattended.

Before any schema change, preview the exact SQL — this is read-only:

```bash
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script
```

If the output contains `DROP`, stop and ask.

**Two rules that override your instincts:**

1. **The data is mock.** Nobody is using Verity for real work yet. When a migration is awkward, wipe and re-seed (`npm run db:reset`) rather than writing backfill code. Do not preserve existing `SalesOrder` rows.
2. **Do not build an inner platform.** Hard columns on `ItemMaster` for what the *system* reasons about (type, group, UOM, valuation, batch flag, stock policy, status, HSN, manufacturing type). Spec fields only for what *humans* reason about (GSM, foam density, headrest count, grain). If you find yourself making UOM configurable, stop.

## Global Constraints

- **Node**: as installed; **Next.js 16.2.10**, **React 19.2.4**, **Prisma 6.12**, **TypeScript 5**, **Zod 4.4.3**, **Papaparse 5.5.4**. Do not add dependencies beyond Vitest (Task 1) without asking.
- **Every new model carries `factoryId String`** and `@@index([factoryId])`.
- **Every server action calls `getOwnerUser()` first** and scopes all queries to `user.factoryId`.
- **`npm run typecheck` must pass** at the end of every task. It is the primary gate for UI work, which has no automated tests.
- **Pure logic goes in `src/lib/spec/`** with a colocated `.test.ts`. Anything that touches Prisma or React does not belong there.
- **Naming**: the concept the client calls a "blueprint" (an attribute set) is called a **spec** here. `Blueprint`/`BlueprintVersion` already exist in the schema and mean production routing. Never conflate them.
- **Commit after every task** with the message given in the task's final step.

## Spec addendum resolved in this plan

The design spec says a Reference field "targets an `ItemGroup` node". That is incomplete: Brand, Model, and Generation target `VehicleBrand`/`VehicleModel`/`VehicleGeneration`; Design targets `Design`; Color targets `Color`. Task 3 introduces `SpecRefTarget` to cover both cases. Item references get a real foreign key (`valueItemId`); attribute-master references are stored as a plain id (`valueRefId`) with no FK, because Prisma cannot express a polymorphic relation. Item references are the ones that feed BOMs, so that is where referential integrity is spent.

## File structure

**New — pure logic (unit tested):**

| File | Responsibility |
|---|---|
| `src/lib/spec/template.ts` | Parse `{token}` templates; render name and code strings |
| `src/lib/spec/template.test.ts` | Tests for the above |
| `src/lib/spec/hash.ts` | Stable hash of a spec answer tuple |
| `src/lib/spec/hash.test.ts` | Tests for the above |
| `src/lib/spec/resolve.ts` | Walk the group tree, merge inherited fields, resolve answers to display values |
| `src/lib/spec/resolve.test.ts` | Tests for the above |
| `src/lib/spec/types.ts` | Shared TypeScript types for the spec engine (no Prisma imports) |
| `src/lib/spec/bom.ts` | Expand a BOM template against a set of answers |
| `src/lib/spec/bom.test.ts` | Tests for the above |
| `src/lib/csv/schema.ts` | Build CSV header/template from spec fields; parse rows back |
| `src/lib/csv/schema.test.ts` | Tests for the above |

**New — server:**

| File | Responsibility |
|---|---|
| `src/server/actions/itemGroups.ts` | CRUD for the group tree |
| `src/server/actions/specFields.ts` | CRUD for field definitions and options |
| `src/server/actions/items.ts` (modify) | `createItemFromSpec`, `updateItemSpec` |
| `src/server/actions/specCsv.ts` | Export, template download, import dry-run and commit |
| `src/server/queries/spec.ts` | Read helpers: resolved fields for a group, dropdown options for a reference field |

**New — UI:**

| File | Responsibility |
|---|---|
| `src/components/spec/SpecCombobox.tsx` | Keyboard-complete dropdown over name + alias |
| `src/components/spec/SpecFieldInput.tsx` | Renders one field by kind |
| `src/components/spec/SpecFieldEditor.tsx` | Configure mode — edit a group's fields |
| `src/components/spec/SpecDataGrid.tsx` | Data mode — the generic sheet |
| `src/components/spec/NamePreviewBar.tsx` | Live name/code preview |
| `src/app/owner/settings/master-data/add/AddMasterDataClient.tsx` | The wizard |

**Modified:** `prisma/schema.prisma`, `MasterSheetView.tsx`, `masterData.ts`, `prisma/seed.ts`, `src/lib/item-constants.ts`.

---

# Phase 0 — Test infrastructure

### Task 1: Add Vitest

There is no test runner in this repo. Every later task depends on this one.

**Files:**
- Create: `vitest.config.ts`
- Create: `src/lib/spec/types.ts`
- Create: `src/lib/spec/template.test.ts`
- Modify: `package.json` (scripts, devDependencies)

**Interfaces:**
- Consumes: nothing
- Produces: `npm test` runs Vitest; `src/lib/spec/types.ts` exports `SpecValueKind`, `ResolvedValue`

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest@^3
```

- [ ] **Step 2: Create the config**

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 3: Add the test scripts**

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Create the shared types**

`src/lib/spec/types.ts`:

```ts
/** How a spec field stores its answer. */
export type SpecValueKind = "VALUE" | "OPTION" | "REFERENCE";

/**
 * One answer, already resolved to the two strings the templates need.
 * `name` is what a name template prints; `code` is what a code template prints.
 * For a reference this is the target's alias/name and its short code; for an
 * option it is the option's label and shortCode; for a value it is the value
 * with its unit suffix applied.
 */
export type ResolvedValue = {
  name: string;
  code: string;
};

/** Answers keyed by the field's template token, e.g. { brand: {...} }. */
export type ResolvedAnswers = Record<string, ResolvedValue>;

/**
 * One unsaved answer, as held by the wizard and consumed by the create action.
 * Lives here rather than beside the input component so server actions can
 * import it without reaching into a "use client" module.
 */
export type SpecAnswer = {
  optionId?: string | null;
  valueItemId?: string | null;
  valueRefId?: string | null;
  valueText?: string | null;
  valueNumber?: number | null;
  valueBool?: boolean | null;
};
```

- [ ] **Step 5: Write a smoke test that fails**

`src/lib/spec/template.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseTemplate } from "./template";

describe("parseTemplate", () => {
  it("returns an empty list for an empty template", () => {
    expect(parseTemplate("")).toEqual([]);
  });
});
```

- [ ] **Step 6: Run it and confirm it fails**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./template"`.

- [ ] **Step 7: Create the minimal module to make it pass**

`src/lib/spec/template.ts`:

```ts
import type { ResolvedAnswers } from "./types";

export type Token =
  | { kind: "text"; text: string }
  | { kind: "field"; key: string };

export function parseTemplate(template: string): Token[] {
  if (!template) return [];
  return [];
}
```

- [ ] **Step 8: Run and confirm it passes**

Run: `npm test`
Expected: PASS — 1 test.

- [ ] **Step 9: Commit**

```bash
git add vitest.config.ts package.json package-lock.json src/lib/spec/
git commit -m "chore: add vitest and spec engine module scaffold"
```

---

# Phase 1 — The engine

### Task 2: `ItemGroup` tree

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/server/actions/itemGroups.ts`
- Modify: `prisma/seed.ts`

**Interfaces:**
- Consumes: `ITEM_TYPE_ORDER` from `@/lib/item-constants`
- Produces: model `ItemGroup`; actions `createItemGroup(input)`, `renameItemGroup(id, name)`, `deleteItemGroup(id)`, `listItemGroups()`

- [ ] **Step 1: Add the model**

In `prisma/schema.prisma`, after the `ItemType` enum:

```prisma
model ItemGroup {
  id           String    @id @default(cuid())
  factoryId    String
  parentId     String?
  parent       ItemGroup?  @relation("ItemGroupTree", fields: [parentId], references: [id], onDelete: Restrict)
  children     ItemGroup[] @relation("ItemGroupTree")
  name         String
  // Feeds {group} in code templates, e.g. "SC" for Seat Cover.
  shortCode    String?
  // Root groups define the type; children inherit it at read time.
  itemType     ItemType
  nameTemplate String?
  codeTemplate String?
  // Root groups render as a tab in the Master Data Studio.
  isSheet      Boolean   @default(false)
  sortOrder    Int       @default(0)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@unique([factoryId, parentId, name])
  @@index([factoryId])
}
```

- [ ] **Step 2: Migrate**

Run: `npx prisma db push`
Expected: migration applied, client regenerated.

- [ ] **Step 3: Write the actions**

`src/server/actions/itemGroups.ts`:

```ts
"use server";

import prisma from "@/lib/prisma";
import { guardDelete } from "@/lib/server/prisma-errors";
import { getOwnerUser } from "@/lib/server/owner";
import { revalidatePath } from "next/cache";
import type { ItemType } from "@prisma/client";

function revalidate() {
  revalidatePath("/owner/settings/master-data");
}

export async function listItemGroups() {
  const user = await getOwnerUser();
  return prisma.itemGroup.findMany({
    where: { factoryId: user.factoryId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createItemGroup(input: {
  name: string;
  itemType: ItemType;
  parentId?: string | null;
  shortCode?: string | null;
}) {
  const user = await getOwnerUser();
  const group = await prisma.itemGroup.create({
    data: {
      factoryId: user.factoryId,
      name: input.name.trim(),
      itemType: input.itemType,
      parentId: input.parentId ?? null,
      shortCode: input.shortCode?.trim() || null,
      isSheet: !input.parentId,
    },
  });
  revalidate();
  return group;
}

export async function renameItemGroup(id: string, name: string) {
  const user = await getOwnerUser();
  await prisma.itemGroup.update({
    where: { id, factoryId: user.factoryId },
    data: { name: name.trim() },
  });
  revalidate();
}

export async function deleteItemGroup(id: string) {
  const user = await getOwnerUser();
  const result = await guardDelete("item group", () =>
    prisma.itemGroup.delete({ where: { id, factoryId: user.factoryId } })
  );
  if ("error" in result) return result;
  revalidate();
  return result;
}
```

- [ ] **Step 4: Seed the six roots**

In `prisma/seed.ts`, add a function and call it after the factory is created:

```ts
const ROOT_GROUPS: { name: string; itemType: ItemType; shortCode: string }[] = [
  { name: "Raw Material",   itemType: "RAW_MATERIAL",     shortCode: "RM" },
  { name: "Semi-Finished",  itemType: "SEMI_FINISHED",    shortCode: "SF" },
  { name: "Finished Good",  itemType: "FINISHED_PRODUCT", shortCode: "FG" },
  { name: "Consumable",     itemType: "CONSUMABLE",       shortCode: "CN" },
  { name: "Packaging",      itemType: "PACKAGING",        shortCode: "PK" },
  { name: "Trading Goods",  itemType: "SPARE_PART",       shortCode: "TG" },
];

async function seedItemGroups(factoryId: string) {
  for (const [i, g] of ROOT_GROUPS.entries()) {
    await prisma.itemGroup.upsert({
      where: { factoryId_parentId_name: { factoryId, parentId: null, name: g.name } },
      update: {},
      create: { ...g, factoryId, isSheet: true, sortOrder: i },
    });
  }
}
```

- [ ] **Step 5: Verify**

Run: `npm run db:reset && npm run typecheck`
Expected: reset succeeds, typecheck passes. Then confirm the rows exist:

```bash
npx prisma studio
```
Expected: `ItemGroup` table shows 6 rows with `isSheet = true`.

- [ ] **Step 6: Commit**

```bash
git add prisma/ src/server/actions/itemGroups.ts
git commit -m "feat(spec): item group tree with six seeded roots"
```

---

### Task 3: `SpecField` and `SpecFieldOption`

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/server/actions/specFields.ts`

**Interfaces:**
- Consumes: `ItemGroup` from Task 2; the existing `FieldType` enum at `prisma/schema.prisma:1042`
- Produces: models `SpecField`, `SpecFieldOption`; enums `SpecFieldKind`, `SpecRefTarget`; actions `createSpecField(input)`, `updateSpecField(id, patch)`, `archiveSpecField(id)`, `addSpecFieldOption(fieldId, input)`

- [ ] **Step 1: Add the enums and models**

In `prisma/schema.prisma`:

```prisma
enum SpecFieldKind {
  VALUE
  OPTION
  REFERENCE
}

/// What a REFERENCE field points at. ITEM_GROUP resolves to ItemMaster rows in
/// that group; every other value resolves to an attribute master.
enum SpecRefTarget {
  ITEM_GROUP
  VEHICLE_BRAND
  VEHICLE_MODEL
  VEHICLE_GENERATION
  DESIGN
  COLOR
}

model SpecField {
  id        String        @id @default(cuid())
  factoryId String
  groupId   String
  group     ItemGroup     @relation(fields: [groupId], references: [id], onDelete: Cascade)
  name      String
  /// Token used in name/code templates, e.g. "brand" for {brand}.
  key       String
  kind      SpecFieldKind
  /// VALUE only. Reuses the existing FieldType enum.
  valueType FieldType?
  /// VALUE only. Rendered after the value: 4 + "HDR" -> "4HDR".
  unitSuffix String?

  /// REFERENCE only.
  refTarget          SpecRefTarget?
  targetGroupId      String?
  targetGroup        ItemGroup?     @relation("SpecFieldTarget", fields: [targetGroupId], references: [id], onDelete: Restrict)
  includeDescendants Boolean        @default(true)
  dependsOnFieldId   String?
  dependsOn          SpecField?     @relation("SpecFieldDeps", fields: [dependsOnFieldId], references: [id], onDelete: SetNull)
  dependents         SpecField[]    @relation("SpecFieldDeps")

  isRequired Boolean   @default(false)
  sortOrder  Int       @default(0)
  /// Soft delete. Archived fields keep their stored answers.
  archivedAt DateTime?
  createdAt  DateTime  @default(now())

  options SpecFieldOption[]

  @@unique([groupId, key])
  @@index([factoryId])
}

model SpecFieldOption {
  id        String    @id @default(cuid())
  fieldId   String
  field     SpecField @relation(fields: [fieldId], references: [id], onDelete: Cascade)
  /// Stored identity.
  value     String
  /// Shown in the dropdown and printed by the name template.
  label     String
  /// Printed by the code template, e.g. "DB".
  shortCode String?
  sortOrder Int       @default(0)

  @@unique([fieldId, value])
}
```

Add the back-relation to `ItemGroup` (Task 2's model):

```prisma
  specFields   SpecField[]
  referencedBy SpecField[] @relation("SpecFieldTarget")
```

- [ ] **Step 2: Migrate**

Run: `npx prisma db push`
Expected: applied cleanly.

- [ ] **Step 3: Write the actions**

`src/server/actions/specFields.ts`:

```ts
"use server";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { revalidatePath } from "next/cache";
import type { SpecFieldKind, SpecRefTarget, FieldType } from "@prisma/client";

function revalidate() {
  revalidatePath("/owner/settings/master-data");
}

/** Lowercase, alphanumeric token derived from the field name: "Back Type" -> "backType". */
export async function toFieldKey(name: string) {
  const parts = name.trim().toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (parts.length === 0) return "field";
  return parts[0] + parts.slice(1).map((p) => p[0].toUpperCase() + p.slice(1)).join("");
}

export async function createSpecField(input: {
  groupId: string;
  name: string;
  kind: SpecFieldKind;
  valueType?: FieldType | null;
  unitSuffix?: string | null;
  refTarget?: SpecRefTarget | null;
  targetGroupId?: string | null;
  includeDescendants?: boolean;
  dependsOnFieldId?: string | null;
  isRequired?: boolean;
}) {
  const user = await getOwnerUser();
  const key = await toFieldKey(input.name);
  const count = await prisma.specField.count({ where: { groupId: input.groupId } });
  const field = await prisma.specField.create({
    data: {
      factoryId: user.factoryId,
      groupId: input.groupId,
      name: input.name.trim(),
      key,
      kind: input.kind,
      valueType: input.valueType ?? null,
      unitSuffix: input.unitSuffix?.trim() || null,
      refTarget: input.refTarget ?? null,
      targetGroupId: input.targetGroupId ?? null,
      includeDescendants: input.includeDescendants ?? true,
      dependsOnFieldId: input.dependsOnFieldId ?? null,
      isRequired: input.isRequired ?? false,
      sortOrder: count,
    },
  });
  revalidate();
  return field;
}

export async function updateSpecField(
  id: string,
  patch: { name?: string; isRequired?: boolean; sortOrder?: number; unitSuffix?: string | null }
) {
  const user = await getOwnerUser();
  await prisma.specField.update({
    where: { id, factoryId: user.factoryId },
    data: patch,
  });
  revalidate();
}

/** Soft delete — existing answers stay readable. */
export async function archiveSpecField(id: string) {
  const user = await getOwnerUser();
  await prisma.specField.update({
    where: { id, factoryId: user.factoryId },
    data: { archivedAt: new Date() },
  });
  revalidate();
}

export async function addSpecFieldOption(
  fieldId: string,
  input: { value: string; label: string; shortCode?: string | null }
) {
  await getOwnerUser();
  const count = await prisma.specFieldOption.count({ where: { fieldId } });
  const option = await prisma.specFieldOption.create({
    data: {
      fieldId,
      value: input.value.trim(),
      label: input.label.trim(),
      shortCode: input.shortCode?.trim() || null,
      sortOrder: count,
    },
  });
  revalidate();
  return option;
}
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add prisma/ src/server/actions/specFields.ts
git commit -m "feat(spec): spec field definitions with options and reference targets"
```

---

### Task 4: `ItemFieldValue` and `ItemMaster` changes

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Consumes: `SpecField`, `SpecFieldOption`, `ItemGroup`
- Produces: model `ItemFieldValue`; `ItemMaster.groupId`, `ItemMaster.manufacturingType`, `ItemMaster.specHash`; enum `ManufacturingType`

- [ ] **Step 1: Add the enum and model**

```prisma
/// Decides whether an item has a BOM. Not derivable from ItemType: a
/// consumable is bought, a semi-finished is made, some items are both.
enum ManufacturingType {
  MAKE
  BUY
  BOTH
}

model ItemFieldValue {
  id        String     @id @default(cuid())
  factoryId String
  itemId    String
  item      ItemMaster @relation(fields: [itemId], references: [id], onDelete: Cascade)
  fieldId   String
  field     SpecField  @relation(fields: [fieldId], references: [id], onDelete: Cascade)

  valueText   String?
  valueNumber Float?
  valueBool   Boolean?

  optionId String?
  option   SpecFieldOption? @relation(fields: [optionId], references: [id], onDelete: Restrict)

  /// REFERENCE to another item. Real FK — these become BOM lines.
  valueItemId String?
  valueItem   ItemMaster? @relation("SpecItemRef", fields: [valueItemId], references: [id], onDelete: Restrict)

  /// REFERENCE to an attribute master (vehicle/design/color). No FK is possible
  /// because the target table varies by SpecField.refTarget.
  valueRefId String?

  @@unique([itemId, fieldId])
  @@index([valueItemId])
  @@index([factoryId, fieldId])
}
```

Add back-relations to `SpecField` and `SpecFieldOption`:

```prisma
  values ItemFieldValue[]
```

- [ ] **Step 2: Extend `ItemMaster`**

In the existing `ItemMaster` model (`prisma/schema.prisma:322`), add:

```prisma
  groupId           String?
  group             ItemGroup?        @relation(fields: [groupId], references: [id], onDelete: Restrict)
  manufacturingType ManufacturingType @default(BUY)
  /// Stable hash of (groupId, all answers). The item's real identity.
  specHash          String?
  specValues        ItemFieldValue[]
  referencedBy      ItemFieldValue[]  @relation("SpecItemRef")
```

and the uniqueness constraint, alongside the existing `@@unique([factoryId, itemCode])`:

```prisma
  @@unique([factoryId, specHash])
```

Add the back-relation to `ItemGroup`:

```prisma
  items ItemMaster[]
```

- [ ] **Step 3: Migrate**

Run: `npx prisma db push`
Expected: applied. `specHash` is nullable so existing rows migrate; only generated items get one.

- [ ] **Step 4: Verify**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add prisma/
git commit -m "feat(spec): item field values, manufacturing type, spec hash identity"
```

---

### Task 5: Field inheritance resolver

Fields defined on `Fabric` must appear on `Leatherite`. This is a pure function over the tree plus a thin Prisma wrapper.

**Files:**
- Create: `src/lib/spec/resolve.ts`
- Create: `src/lib/spec/resolve.test.ts`
- Create: `src/server/queries/spec.ts`

**Interfaces:**
- Consumes: `SpecField`, `ItemGroup`
- Produces: `mergeInheritedFields(chain)`, `groupChain(groups, groupId)`; `getResolvedFields(groupId)` (server)

- [ ] **Step 1: Write the failing test**

`src/lib/spec/resolve.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { groupChain, mergeInheritedFields } from "./resolve";

const groups = [
  { id: "rm", parentId: null },
  { id: "fab", parentId: "rm" },
  { id: "lea", parentId: "fab" },
];

describe("groupChain", () => {
  it("returns root-first ancestry including the group itself", () => {
    expect(groupChain(groups, "lea").map((g) => g.id)).toEqual(["rm", "fab", "lea"]);
  });

  it("returns just the group for a root", () => {
    expect(groupChain(groups, "rm").map((g) => g.id)).toEqual(["rm"]);
  });

  it("returns an empty chain for an unknown group", () => {
    expect(groupChain(groups, "nope")).toEqual([]);
  });
});

describe("mergeInheritedFields", () => {
  const fields = [
    { id: "f1", groupId: "fab", key: "gsm", sortOrder: 0, archivedAt: null },
    { id: "f2", groupId: "lea", key: "grain", sortOrder: 0, archivedAt: null },
    { id: "f3", groupId: "fab", key: "grain", sortOrder: 1, archivedAt: null },
    { id: "f4", groupId: "rm", key: "old", sortOrder: 0, archivedAt: new Date() },
  ];

  it("collects ancestor fields before own fields", () => {
    const merged = mergeInheritedFields(["rm", "fab", "lea"], fields);
    expect(merged.map((f) => f.key)).toEqual(["gsm", "grain"]);
  });

  it("lets a descendant override an ancestor field with the same key", () => {
    const merged = mergeInheritedFields(["rm", "fab", "lea"], fields);
    expect(merged.find((f) => f.key === "grain")!.id).toBe("f2");
  });

  it("excludes archived fields", () => {
    const merged = mergeInheritedFields(["rm", "fab", "lea"], fields);
    expect(merged.some((f) => f.key === "old")).toBe(false);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test`
Expected: FAIL — cannot resolve `./resolve`.

- [ ] **Step 3: Implement**

`src/lib/spec/resolve.ts`:

```ts
type GroupNode = { id: string; parentId: string | null };

type FieldLike = {
  id: string;
  groupId: string;
  key: string;
  sortOrder: number;
  archivedAt: Date | null;
};

/**
 * Ancestry for a group, root first, including the group itself.
 * Returns [] if the group is unknown. Guards against a cycle by capping the
 * walk at the number of known groups.
 */
export function groupChain<T extends GroupNode>(groups: T[], groupId: string): T[] {
  const byId = new Map(groups.map((g) => [g.id, g]));
  const chain: T[] = [];
  let current = byId.get(groupId);
  let guard = groups.length + 1;
  while (current && guard-- > 0) {
    chain.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return chain;
}

/**
 * Fields visible on the last group in `chain`: ancestors first, with a
 * descendant's field replacing an ancestor's when they share a key.
 * Archived fields are dropped.
 */
export function mergeInheritedFields<T extends FieldLike>(chain: string[], fields: T[]): T[] {
  const depth = new Map(chain.map((id, i) => [id, i]));
  const byKey = new Map<string, T>();

  for (const field of fields) {
    if (field.archivedAt) continue;
    const fieldDepth = depth.get(field.groupId);
    if (fieldDepth === undefined) continue;

    const existing = byKey.get(field.key);
    if (!existing || depth.get(existing.groupId)! <= fieldDepth) {
      byKey.set(field.key, field);
    }
  }

  return [...byKey.values()].sort((a, b) => {
    const da = depth.get(a.groupId)! - depth.get(b.groupId)!;
    return da !== 0 ? da : a.sortOrder - b.sortOrder;
  });
}
```

- [ ] **Step 4: Run and confirm passing**

Run: `npm test`
Expected: PASS — 6 tests.

- [ ] **Step 5: Add the server wrapper**

`src/server/queries/spec.ts`:

```ts
import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { groupChain, mergeInheritedFields } from "@/lib/spec/resolve";

/** Every spec field visible on a group, ancestors merged in, options included. */
export async function getResolvedFields(groupId: string) {
  const user = await getOwnerUser();
  const [groups, fields] = await Promise.all([
    prisma.itemGroup.findMany({
      where: { factoryId: user.factoryId },
      select: { id: true, parentId: true },
    }),
    prisma.specField.findMany({
      where: { factoryId: user.factoryId },
      include: { options: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  const chain = groupChain(groups, groupId).map((g) => g.id);
  return mergeInheritedFields(chain, fields);
}
```

- [ ] **Step 6: Verify and commit**

Run: `npm test && npm run typecheck`
Expected: both pass.

```bash
git add src/lib/spec/resolve.ts src/lib/spec/resolve.test.ts src/server/queries/spec.ts
git commit -m "feat(spec): inherited field resolution down the group tree"
```

---

# Phase 2 — Naming, codes, identity

### Task 6: Template parser

**Files:**
- Modify: `src/lib/spec/template.ts`
- Modify: `src/lib/spec/template.test.ts`

**Interfaces:**
- Consumes: `Token` from Task 1
- Produces: `parseTemplate(template): Token[]`

- [ ] **Step 1: Replace the smoke test with real cases**

`src/lib/spec/template.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseTemplate } from "./template";

describe("parseTemplate", () => {
  it("returns an empty list for an empty template", () => {
    expect(parseTemplate("")).toEqual([]);
  });

  it("parses a single field token", () => {
    expect(parseTemplate("{brand}")).toEqual([{ kind: "field", key: "brand" }]);
  });

  it("parses literal text", () => {
    expect(parseTemplate("Seat Cover")).toEqual([{ kind: "text", text: "Seat Cover" }]);
  });

  it("parses mixed text and tokens", () => {
    expect(parseTemplate("{brand} {model}")).toEqual([
      { kind: "field", key: "brand" },
      { kind: "text", text: " " },
      { kind: "field", key: "model" },
    ]);
  });

  it("parses a separator between tokens", () => {
    expect(parseTemplate("{a}-{b}")).toEqual([
      { kind: "field", key: "a" },
      { kind: "text", text: "-" },
      { kind: "field", key: "b" },
    ]);
  });

  it("trims whitespace inside braces", () => {
    expect(parseTemplate("{ brand }")).toEqual([{ kind: "field", key: "brand" }]);
  });

  it("treats an unclosed brace as literal text", () => {
    expect(parseTemplate("{brand")).toEqual([{ kind: "text", text: "{brand" }]);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test`
Expected: FAIL — 6 of 7 fail; `parseTemplate` returns `[]`.

- [ ] **Step 3: Implement**

Replace `parseTemplate` in `src/lib/spec/template.ts`:

```ts
export function parseTemplate(template: string): Token[] {
  if (!template) return [];
  const tokens: Token[] = [];
  let cursor = 0;

  while (cursor < template.length) {
    const open = template.indexOf("{", cursor);
    if (open === -1) {
      tokens.push({ kind: "text", text: template.slice(cursor) });
      break;
    }
    const close = template.indexOf("}", open);
    if (close === -1) {
      // Unclosed brace: the rest is literal.
      tokens.push({ kind: "text", text: template.slice(cursor) });
      break;
    }
    if (open > cursor) {
      tokens.push({ kind: "text", text: template.slice(cursor, open) });
    }
    tokens.push({ kind: "field", key: template.slice(open + 1, close).trim() });
    cursor = close + 1;
  }

  return tokens;
}
```

- [ ] **Step 4: Run and confirm passing**

Run: `npm test`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/spec/template.ts src/lib/spec/template.test.ts
git commit -m "feat(spec): template token parser"
```

---

### Task 7: Render names and codes

**Files:**
- Modify: `src/lib/spec/template.ts`
- Modify: `src/lib/spec/template.test.ts`

**Interfaces:**
- Consumes: `parseTemplate`, `ResolvedAnswers`
- Produces: `renderTemplate(template, answers, mode): string`

- [ ] **Step 1: Add the failing tests**

Append to `src/lib/spec/template.test.ts`:

```ts
import { renderTemplate } from "./template";
import type { ResolvedAnswers } from "./types";

const answers: ResolvedAnswers = {
  group:      { name: "Seat Cover",  code: "SC" },
  brand:      { name: "Maruti",      code: "MRT" },
  model:      { name: "Swift",       code: "SWFT" },
  generation: { name: "2005-2011",   code: "0511" },
  backType:   { name: "DB",          code: "DB" },
  headrests:  { name: "4HDR",        code: "4" },
  armrest:    { name: "No Arm",      code: "NA" },
  color:      { name: "Beige",       code: "BEI" },
};

describe("renderTemplate", () => {
  it("renders the display name", () => {
    const out = renderTemplate(
      "{group} {brand} {model} {generation} {backType} {headrests} {armrest} {color}",
      answers,
      "name"
    );
    expect(out).toBe("Seat Cover Maruti Swift 2005-2011 DB 4HDR No Arm Beige");
  });

  it("renders the code using short codes", () => {
    const out = renderTemplate(
      "{group}-{brand}-{model}-{generation}-{backType}{headrests}-{armrest}-{color}",
      answers,
      "code"
    );
    expect(out).toBe("SC-MRT-SWFT-0511-DB4-NA-BEI");
  });

  it("drops an unanswered token and its trailing separator", () => {
    expect(renderTemplate("{brand} {missing} {model}", answers, "name")).toBe("Maruti Swift");
  });

  it("drops an unanswered token in code mode without doubling separators", () => {
    expect(renderTemplate("{brand}-{missing}-{model}", answers, "code")).toBe("MRT-SWFT");
  });

  it("collapses repeated whitespace", () => {
    expect(renderTemplate("{brand}   {model}", answers, "name")).toBe("Maruti Swift");
  });

  it("returns an empty string when nothing is answered", () => {
    expect(renderTemplate("{a} {b}", {}, "name")).toBe("");
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test`
Expected: FAIL — `renderTemplate is not a function`.

- [ ] **Step 3: Implement**

Append to `src/lib/spec/template.ts`:

```ts
/**
 * Render a template against resolved answers.
 *
 * An unanswered token collapses along with the separator that follows it, so a
 * half-filled spec still reads cleanly — this is what drives the live preview
 * in the Add Master Data wizard.
 */
export function renderTemplate(
  template: string,
  answers: ResolvedAnswers,
  mode: "name" | "code"
): string {
  const tokens = parseTemplate(template);
  const parts: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.kind === "text") {
      // Only keep a separator if something was emitted before it and a field
      // still follows.
      const hasPrev = parts.length > 0;
      const nextField = tokens.slice(i + 1).find((t) => t.kind === "field");
      const nextAnswered = nextField && answers[(nextField as { key: string }).key];
      if (hasPrev && nextAnswered) parts.push(token.text);
      continue;
    }
    const value = answers[token.key];
    if (!value) continue;
    const text = mode === "name" ? value.name : value.code;
    if (text) parts.push(text);
  }

  return parts.join("").replace(/\s+/g, " ").trim();
}
```

- [ ] **Step 4: Run and confirm passing**

Run: `npm test`
Expected: PASS — 13 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/spec/template.ts src/lib/spec/template.test.ts
git commit -m "feat(spec): render item names and codes from templates"
```

---

### Task 8: Resolve raw answers into `ResolvedValue`

Turns database answers into the `{ name, code }` pairs `renderTemplate` consumes, applying the `alias ?? name` rule.

**Files:**
- Modify: `src/lib/spec/resolve.ts`
- Modify: `src/lib/spec/resolve.test.ts`

**Interfaces:**
- Consumes: `ResolvedValue`, `ResolvedAnswers`
- Produces: `resolveAnswer(field, raw): ResolvedValue | null`, `resolveAnswers(fields, raws): ResolvedAnswers`

- [ ] **Step 1: Add the failing tests**

Append to `src/lib/spec/resolve.test.ts`:

```ts
import { resolveAnswer } from "./resolve";

describe("resolveAnswer", () => {
  it("resolves a text value", () => {
    const field = { kind: "VALUE" as const, valueType: "TEXT" as const, unitSuffix: null };
    expect(resolveAnswer(field, { valueText: "Napa" })).toEqual({ name: "Napa", code: "Napa" });
  });

  it("appends the unit suffix to a number", () => {
    const field = { kind: "VALUE" as const, valueType: "NUMBER" as const, unitSuffix: "HDR" };
    expect(resolveAnswer(field, { valueNumber: 4 })).toEqual({ name: "4HDR", code: "4" });
  });

  it("resolves an option to its label and short code", () => {
    const field = { kind: "OPTION" as const, valueType: null, unitSuffix: null };
    const raw = { option: { label: "Double Back", shortCode: "DB" } };
    expect(resolveAnswer(field, raw)).toEqual({ name: "Double Back", code: "DB" });
  });

  it("falls back to the label when an option has no short code", () => {
    const field = { kind: "OPTION" as const, valueType: null, unitSuffix: null };
    const raw = { option: { label: "Double Back", shortCode: null } };
    expect(resolveAnswer(field, raw)).toEqual({ name: "Double Back", code: "Double Back" });
  });

  it("prefers the alias over the name for an item reference", () => {
    const field = { kind: "REFERENCE" as const, valueType: null, unitSuffix: null };
    const raw = {
      valueItem: { name: "Leatherite Beige 220 GSM", aliasName: "Beige", itemCode: "RM-0042" },
    };
    expect(resolveAnswer(field, raw)).toEqual({ name: "Beige", code: "RM-0042" });
  });

  it("uses the name when a referenced item has no alias", () => {
    const field = { kind: "REFERENCE" as const, valueType: null, unitSuffix: null };
    const raw = { valueItem: { name: "Napa Black", aliasName: null, itemCode: "RM-0007" } };
    expect(resolveAnswer(field, raw)).toEqual({ name: "Napa Black", code: "RM-0007" });
  });

  it("resolves an attribute-master reference by its label", () => {
    const field = { kind: "REFERENCE" as const, valueType: null, unitSuffix: null };
    expect(resolveAnswer(field, { refLabel: "Maruti", refCode: "MRT" })).toEqual({
      name: "Maruti",
      code: "MRT",
    });
  });

  it("returns null when nothing is answered", () => {
    const field = { kind: "VALUE" as const, valueType: "TEXT" as const, unitSuffix: null };
    expect(resolveAnswer(field, {})).toBeNull();
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test`
Expected: FAIL — `resolveAnswer is not a function`.

- [ ] **Step 3: Implement**

Append to `src/lib/spec/resolve.ts`:

```ts
import type { ResolvedValue, ResolvedAnswers } from "./types";

type FieldShape = {
  kind: "VALUE" | "OPTION" | "REFERENCE";
  valueType: string | null;
  unitSuffix: string | null;
};

export type RawAnswer = {
  valueText?: string | null;
  valueNumber?: number | null;
  valueBool?: boolean | null;
  option?: { label: string; shortCode: string | null } | null;
  valueItem?: { name: string; aliasName: string | null; itemCode: string | null } | null;
  /** Attribute-master reference, pre-loaded by the caller. */
  refLabel?: string | null;
  refCode?: string | null;
};

/**
 * Collapse one stored answer into the pair of strings the templates print.
 * The alias-over-name rule lives here: "Leatherite Beige 220 GSM" with alias
 * "Beige" contributes "Beige" to a parent item's name.
 */
export function resolveAnswer(field: FieldShape, raw: RawAnswer): ResolvedValue | null {
  if (field.kind === "OPTION") {
    if (!raw.option) return null;
    return { name: raw.option.label, code: raw.option.shortCode || raw.option.label };
  }

  if (field.kind === "REFERENCE") {
    if (raw.valueItem) {
      const name = raw.valueItem.aliasName || raw.valueItem.name;
      return { name, code: raw.valueItem.itemCode || name };
    }
    if (raw.refLabel) {
      return { name: raw.refLabel, code: raw.refCode || raw.refLabel };
    }
    return null;
  }

  if (raw.valueNumber !== undefined && raw.valueNumber !== null) {
    const base = String(raw.valueNumber);
    return { name: base + (field.unitSuffix ?? ""), code: base };
  }
  if (raw.valueBool !== undefined && raw.valueBool !== null) {
    const base = raw.valueBool ? "Yes" : "No";
    return { name: base, code: base };
  }
  if (raw.valueText) {
    return { name: raw.valueText, code: raw.valueText };
  }
  return null;
}

/** Resolve a whole answer set, keyed by each field's template token. */
export function resolveAnswers(
  fields: (FieldShape & { key: string })[],
  raws: Record<string, RawAnswer>
): ResolvedAnswers {
  const out: ResolvedAnswers = {};
  for (const field of fields) {
    const resolved = resolveAnswer(field, raws[field.key] ?? {});
    if (resolved) out[field.key] = resolved;
  }
  return out;
}
```

- [ ] **Step 4: Run and confirm passing**

Run: `npm test`
Expected: PASS — 21 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/spec/resolve.ts src/lib/spec/resolve.test.ts
git commit -m "feat(spec): resolve stored answers into name and code values"
```

---

### Task 9: Spec hash identity

**Files:**
- Create: `src/lib/spec/hash.ts`
- Create: `src/lib/spec/hash.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `specHash(groupId, answers): string`

- [ ] **Step 1: Write the failing test**

`src/lib/spec/hash.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { specHash } from "./hash";

describe("specHash", () => {
  const answers = { brand: "b1", model: "m1", headrests: "4" };

  it("returns a 64-character hex digest", () => {
    expect(specHash("g1", answers)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is stable across key order", () => {
    const reordered = { headrests: "4", model: "m1", brand: "b1" };
    expect(specHash("g1", reordered)).toBe(specHash("g1", answers));
  });

  it("differs when a value differs", () => {
    expect(specHash("g1", { ...answers, headrests: "5" })).not.toBe(specHash("g1", answers));
  });

  it("differs when the group differs", () => {
    expect(specHash("g2", answers)).not.toBe(specHash("g1", answers));
  });

  it("ignores empty answers so an added optional field does not change identity", () => {
    expect(specHash("g1", { ...answers, note: "" })).toBe(specHash("g1", answers));
  });

  it("does not collide when values are shuffled between keys", () => {
    expect(specHash("g1", { brand: "m1", model: "b1", headrests: "4" })).not.toBe(
      specHash("g1", answers)
    );
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test`
Expected: FAIL — cannot resolve `./hash`.

- [ ] **Step 3: Implement**

`src/lib/spec/hash.ts`:

```ts
import { createHash } from "node:crypto";

/**
 * The item's identity: a stable digest of its group plus every answered field.
 *
 * Values are the storage identities — option ids, referenced row ids, raw text
 * — never display labels, so renaming a fabric does not change the identity of
 * every seat cover that uses it.
 *
 * Empty answers are excluded so that adding an optional field to a group does
 * not silently change the identity of items already stored.
 */
export function specHash(groupId: string, answers: Record<string, string>): string {
  const entries = Object.entries(answers)
    .filter(([, value]) => value !== "" && value !== null && value !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    // Length-prefix each part so ("ab","c") cannot collide with ("a","bc").
    .map(([key, value]) => `${key.length}:${key}=${value.length}:${value}`);

  return createHash("sha256").update(`${groupId}|${entries.join("|")}`).digest("hex");
}
```

- [ ] **Step 4: Run and confirm passing**

Run: `npm test`
Expected: PASS — 27 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/spec/hash.ts src/lib/spec/hash.test.ts
git commit -m "feat(spec): stable spec hash as item identity"
```

---

# Phase 3 — The generic sheet

### Task 10: Reference dropdown options query

Powers every Reference field: the options are the target's rows, filtered by any dependency.

**Files:**
- Modify: `src/server/queries/spec.ts`

**Interfaces:**
- Consumes: `SpecField`, `getResolvedFields`
- Produces: `getReferenceOptions(fieldId, parentValueId?): Promise<RefOption[]>` where `RefOption = { id: string; label: string; sublabel: string | null; searchText: string }`

- [ ] **Step 1: Add descendant collection to `resolve.ts`**

Append to `src/lib/spec/resolve.ts`:

```ts
/** A group and every group beneath it. Used by includeDescendants. */
export function descendantIds<T extends GroupNode>(groups: T[], rootId: string): string[] {
  const childrenOf = new Map<string, string[]>();
  for (const g of groups) {
    if (!g.parentId) continue;
    const list = childrenOf.get(g.parentId) ?? [];
    list.push(g.id);
    childrenOf.set(g.parentId, list);
  }
  const out: string[] = [];
  const queue = [rootId];
  let guard = groups.length + 1;
  while (queue.length && guard-- > 0) {
    const id = queue.shift()!;
    out.push(id);
    queue.push(...(childrenOf.get(id) ?? []));
  }
  return out;
}
```

- [ ] **Step 2: Add its test**

Append to `src/lib/spec/resolve.test.ts`:

```ts
import { descendantIds } from "./resolve";

describe("descendantIds", () => {
  const tree = [
    { id: "rm", parentId: null },
    { id: "fab", parentId: "rm" },
    { id: "lea", parentId: "fab" },
    { id: "suede", parentId: "fab" },
    { id: "foam", parentId: "rm" },
  ];

  it("includes the root itself", () => {
    expect(descendantIds(tree, "lea")).toEqual(["lea"]);
  });

  it("collects every descendant", () => {
    expect(descendantIds(tree, "fab").sort()).toEqual(["fab", "lea", "suede"]);
  });

  it("collects the whole subtree from a root", () => {
    expect(descendantIds(tree, "rm").sort()).toEqual(["fab", "foam", "lea", "rm", "suede"]);
  });
});
```

Run: `npm test`
Expected: PASS — 30 tests.

- [ ] **Step 3: Add the query**

Append to `src/server/queries/spec.ts`:

```ts
import { descendantIds } from "@/lib/spec/resolve";

export type RefOption = {
  id: string;
  label: string;
  sublabel: string | null;
  /** Lowercased name + alias + code, for client-side type-ahead. */
  searchText: string;
};

/**
 * Options for a REFERENCE field. `parentValueId` is the answer to the field's
 * dependsOn field — passing it filters models by brand, generations by model.
 */
export async function getReferenceOptions(
  fieldId: string,
  parentValueId?: string
): Promise<RefOption[]> {
  const user = await getOwnerUser();
  const field = await prisma.specField.findFirst({
    where: { id: fieldId, factoryId: user.factoryId },
  });
  if (!field || field.kind !== "REFERENCE" || !field.refTarget) return [];

  const search = (...parts: (string | null)[]) =>
    parts.filter(Boolean).join(" ").toLowerCase();

  if (field.refTarget === "ITEM_GROUP") {
    if (!field.targetGroupId) return [];
    const groups = await prisma.itemGroup.findMany({
      where: { factoryId: user.factoryId },
      select: { id: true, parentId: true },
    });
    const ids = field.includeDescendants
      ? descendantIds(groups, field.targetGroupId)
      : [field.targetGroupId];

    const items = await prisma.itemMaster.findMany({
      where: { factoryId: user.factoryId, groupId: { in: ids }, status: "ACTIVE" },
      select: { id: true, name: true, aliasName: true, itemCode: true },
      orderBy: { name: "asc" },
    });
    return items.map((i) => ({
      id: i.id,
      label: i.aliasName || i.name,
      sublabel: i.itemCode,
      searchText: search(i.name, i.aliasName, i.itemCode),
    }));
  }

  if (field.refTarget === "VEHICLE_BRAND") {
    const rows = await prisma.vehicleBrand.findMany({
      where: { factoryId: user.factoryId },
      orderBy: { name: "asc" },
    });
    return rows.map((r) => ({ id: r.id, label: r.name, sublabel: null, searchText: search(r.name) }));
  }

  if (field.refTarget === "VEHICLE_MODEL") {
    const rows = await prisma.vehicleModel.findMany({
      where: {
        factoryId: user.factoryId,
        ...(parentValueId ? { brandId: parentValueId } : {}),
      },
      orderBy: { name: "asc" },
    });
    return rows.map((r) => ({ id: r.id, label: r.name, sublabel: null, searchText: search(r.name) }));
  }

  if (field.refTarget === "VEHICLE_GENERATION") {
    const rows = await prisma.vehicleGeneration.findMany({
      where: { ...(parentValueId ? { modelId: parentValueId } : {}) },
      orderBy: { name: "asc" },
    });
    return rows.map((r) => ({ id: r.id, label: r.name, sublabel: null, searchText: search(r.name) }));
  }

  if (field.refTarget === "DESIGN") {
    const rows = await prisma.design.findMany({
      where: { factoryId: user.factoryId },
      orderBy: { name: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      label: r.category ? `${r.category} ${r.name}` : r.name,
      sublabel: r.category,
      searchText: search(r.name, r.category),
    }));
  }

  const colors = await prisma.color.findMany({
    where: { factoryId: user.factoryId },
    orderBy: { name: "asc" },
  });
  return colors.map((c) => ({ id: c.id, label: c.name, sublabel: null, searchText: search(c.name) }));
}
```

- [ ] **Step 4: Verify and commit**

Run: `npm test && npm run typecheck`
Expected: both pass.

```bash
git add src/lib/spec/ src/server/queries/spec.ts
git commit -m "feat(spec): reference field option resolution with descendants and cascade"
```

---

### Task 11: `SpecCombobox`

The keyboard-complete dropdown used everywhere. No automated tests — verification is typecheck plus the manual checklist.

**Files:**
- Create: `src/components/spec/SpecCombobox.tsx`

**Interfaces:**
- Consumes: `RefOption` from Task 10
- Produces: `<SpecCombobox options value onChange onCreate? placeholder disabled />`

- [ ] **Step 1: Implement**

`src/components/spec/SpecCombobox.tsx`:

```tsx
"use client";

import { useMemo, useRef, useState } from "react";
import type { RefOption } from "@/server/queries/spec";

type Props = {
  options: RefOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  /** When set, an unmatched query offers inline creation. */
  onCreate?: (query: string) => void;
  placeholder?: string;
  disabled?: boolean;
  disabledReason?: string;
};

export function SpecCombobox({
  options, value, onChange, onCreate, placeholder, disabled, disabledReason,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.id === value) ?? null;

  // Matches name, alias and code — the alias is why "beige" finds
  // "Leatherite Beige 220 GSM".
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 50);
    return options.filter((o) => o.searchText.includes(q)).slice(0, 50);
  }, [options, query]);

  const canCreate = Boolean(onCreate) && query.trim().length > 0 && matches.length === 0;
  const rowCount = matches.length + (canCreate ? 1 : 0);

  function commit(index: number) {
    if (canCreate && index === matches.length) {
      onCreate!(query.trim());
    } else if (matches[index]) {
      onChange(matches[index].id);
      setQuery("");
    }
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setCursor((c) => Math.min(c + 1, rowCount - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (open) commit(cursor); }
    else if (e.key === "Escape") { setOpen(false); }
    else if (e.key === "Backspace" && !query && selected) { onChange(null); }
  }

  return (
    <div className="relative" title={disabled ? disabledReason : undefined}>
      <input
        ref={inputRef}
        disabled={disabled}
        value={open ? query : selected?.label ?? ""}
        placeholder={placeholder}
        onFocus={() => { setOpen(true); setCursor(0); }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setCursor(0); }}
        onKeyDown={onKeyDown}
        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm disabled:bg-neutral-100 disabled:text-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
      />
      {open && rowCount > 0 && (
        <ul className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          {matches.map((o, i) => (
            <li
              key={o.id}
              onMouseDown={(e) => { e.preventDefault(); commit(i); }}
              onMouseEnter={() => setCursor(i)}
              className={`cursor-pointer px-3 py-2 text-sm ${i === cursor ? "bg-neutral-100 dark:bg-neutral-800" : ""}`}
            >
              <span>{o.label}</span>
              {o.sublabel && <span className="ml-2 text-xs text-neutral-500">{o.sublabel}</span>}
            </li>
          ))}
          {canCreate && (
            <li
              onMouseDown={(e) => { e.preventDefault(); commit(matches.length); }}
              onMouseEnter={() => setCursor(matches.length)}
              className={`cursor-pointer px-3 py-2 text-sm font-medium ${cursor === matches.length ? "bg-neutral-100 dark:bg-neutral-800" : ""}`}
            >
              ＋ Add “{query.trim()}”
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/components/spec/SpecCombobox.tsx
git commit -m "feat(spec): keyboard-complete combobox over name, alias and code"
```

---

### Task 12: `SpecFieldInput`

Renders one field according to its kind. Used by both the wizard and the data grid.

**Files:**
- Create: `src/components/spec/SpecFieldInput.tsx`

**Interfaces:**
- Consumes: `SpecCombobox`
- Produces: `<SpecFieldInput field options value onChange onCreate? />`; type `SpecAnswer = { optionId?: string | null; valueItemId?: string | null; valueRefId?: string | null; valueText?: string | null; valueNumber?: number | null; valueBool?: boolean | null }`

- [ ] **Step 1: Implement**

`src/components/spec/SpecFieldInput.tsx`:

```tsx
"use client";

import { SpecCombobox } from "./SpecCombobox";
import type { RefOption } from "@/server/queries/spec";
import type { SpecAnswer } from "@/lib/spec/types";

export type { SpecAnswer };

export type SpecFieldShape = {
  id: string;
  key: string;
  name: string;
  kind: "VALUE" | "OPTION" | "REFERENCE";
  valueType: string | null;
  unitSuffix: string | null;
  refTarget: string | null;
  isRequired: boolean;
  dependsOnFieldId: string | null;
  options: { id: string; label: string; shortCode: string | null }[];
};

type Props = {
  field: SpecFieldShape;
  /** REFERENCE only, loaded by the parent. */
  options?: RefOption[];
  value: SpecAnswer;
  onChange: (next: SpecAnswer) => void;
  onCreate?: (query: string) => void;
  disabled?: boolean;
  disabledReason?: string;
};

export function SpecFieldInput({
  field, options = [], value, onChange, onCreate, disabled, disabledReason,
}: Props) {
  const label = (
    <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
      {field.name}
      {field.isRequired && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );

  if (field.kind === "REFERENCE") {
    const isItemRef = field.refTarget === "ITEM_GROUP";
    return (
      <div>
        {label}
        <SpecCombobox
          options={options}
          value={isItemRef ? value.valueItemId ?? null : value.valueRefId ?? null}
          onChange={(id) => onChange(isItemRef ? { valueItemId: id } : { valueRefId: id })}
          onCreate={onCreate}
          placeholder={`Select ${field.name.toLowerCase()}`}
          disabled={disabled}
          disabledReason={disabledReason}
        />
      </div>
    );
  }

  if (field.kind === "OPTION") {
    return (
      <div>
        {label}
        <select
          value={value.optionId ?? ""}
          disabled={disabled}
          onChange={(e) => onChange({ optionId: e.target.value || null })}
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="">—</option>
          {field.options.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }

  if (field.valueType === "TOGGLE" || field.valueType === "CHECKBOX") {
    return (
      <div>
        {label}
        <input
          type="checkbox"
          checked={Boolean(value.valueBool)}
          disabled={disabled}
          onChange={(e) => onChange({ valueBool: e.target.checked })}
          className="h-5 w-5 rounded border-neutral-300"
        />
      </div>
    );
  }

  const numeric = field.valueType === "NUMBER" || field.valueType === "MEASUREMENT";
  return (
    <div>
      {label}
      <div className="flex items-center gap-2">
        <input
          type={numeric ? "number" : "text"}
          value={numeric ? value.valueNumber ?? "" : value.valueText ?? ""}
          disabled={disabled}
          onChange={(e) =>
            onChange(
              numeric
                ? { valueNumber: e.target.value === "" ? null : Number(e.target.value) }
                : { valueText: e.target.value }
            )
          }
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        {field.unitSuffix && (
          <span className="text-xs text-neutral-500">{field.unitSuffix}</span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify and commit**

Run: `npm run typecheck`
Expected: passes.

```bash
git add src/components/spec/SpecFieldInput.tsx
git commit -m "feat(spec): field input renderer for value, option and reference kinds"
```

---

### Task 13: `SpecFieldEditor` — Configure mode

**Files:**
- Create: `src/components/spec/SpecFieldEditor.tsx`

**Interfaces:**
- Consumes: `createSpecField`, `updateSpecField`, `archiveSpecField`, `addSpecFieldOption` (Task 3); `listItemGroups` (Task 2)
- Produces: `<SpecFieldEditor group fields allGroups />`

- [ ] **Step 1: Implement**

`src/components/spec/SpecFieldEditor.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { createSpecField, archiveSpecField, addSpecFieldOption } from "@/server/actions/specFields";
import type { SpecFieldShape } from "./SpecFieldInput";

type Group = { id: string; name: string; nameTemplate: string | null; codeTemplate: string | null };

const REF_TARGETS = [
  { value: "ITEM_GROUP", label: "Items from a group" },
  { value: "VEHICLE_BRAND", label: "Vehicle brand" },
  { value: "VEHICLE_MODEL", label: "Vehicle model" },
  { value: "VEHICLE_GENERATION", label: "Vehicle generation" },
  { value: "DESIGN", label: "Design" },
  { value: "COLOR", label: "Colour" },
];

export function SpecFieldEditor({
  group, fields, allGroups,
}: { group: Group; fields: SpecFieldShape[]; allGroups: { id: string; name: string }[] }) {
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"VALUE" | "OPTION" | "REFERENCE">("VALUE");
  const [valueType, setValueType] = useState("TEXT");
  const [refTarget, setRefTarget] = useState("ITEM_GROUP");
  const [targetGroupId, setTargetGroupId] = useState("");
  const [dependsOnFieldId, setDependsOnFieldId] = useState("");

  function add() {
    if (!name.trim()) return;
    start(async () => {
      await createSpecField({
        groupId: group.id,
        name,
        kind,
        valueType: kind === "VALUE" ? (valueType as never) : null,
        refTarget: kind === "REFERENCE" ? (refTarget as never) : null,
        targetGroupId: kind === "REFERENCE" && refTarget === "ITEM_GROUP" ? targetGroupId : null,
        dependsOnFieldId: dependsOnFieldId || null,
      });
      setName("");
    });
  }

  return (
    <div className="space-y-6 p-4">
      <section>
        <h3 className="mb-2 text-sm font-semibold">Fields on {group.name}</h3>
        <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {fields.map((f) => (
            <li key={f.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <span>
                <span className="font-medium">{f.name}</span>
                <code className="ml-2 text-xs text-neutral-500">{`{${f.key}}`}</code>
                <span className="ml-2 text-xs text-neutral-400">{f.kind}</span>
              </span>
              <button
                onClick={() => start(() => archiveSpecField(f.id).then(() => {}))}
                className="text-xs text-red-600 hover:underline"
              >
                Archive
              </button>
            </li>
          ))}
          {fields.length === 0 && (
            <li className="px-3 py-4 text-sm text-neutral-500">No fields yet.</li>
          )}
        </ul>
      </section>

      <section className="space-y-2 rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
        <h3 className="text-sm font-semibold">Add a field</h3>
        <div className="flex flex-wrap items-end gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Field name"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <select value={kind} onChange={(e) => setKind(e.target.value as never)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
            <option value="VALUE">Value</option>
            <option value="OPTION">Option list</option>
            <option value="REFERENCE">Reference</option>
          </select>

          {kind === "VALUE" && (
            <select value={valueType} onChange={(e) => setValueType(e.target.value)}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
              {["TEXT", "NUMBER", "MEASUREMENT", "TOGGLE"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}

          {kind === "REFERENCE" && (
            <>
              <select value={refTarget} onChange={(e) => setRefTarget(e.target.value)}
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
                {REF_TARGETS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {refTarget === "ITEM_GROUP" && (
                <select value={targetGroupId} onChange={(e) => setTargetGroupId(e.target.value)}
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
                  <option value="">Target group…</option>
                  {allGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              )}
              <select value={dependsOnFieldId} onChange={(e) => setDependsOnFieldId(e.target.value)}
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
                <option value="">No dependency</option>
                {fields.filter((f) => f.kind === "REFERENCE").map((f) => (
                  <option key={f.id} value={f.id}>Filtered by {f.name}</option>
                ))}
              </select>
            </>
          )}

          <button onClick={add} disabled={pending}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900">
            Add field
          </button>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify and commit**

Run: `npm run typecheck`
Expected: passes.

```bash
git add src/components/spec/SpecFieldEditor.tsx
git commit -m "feat(spec): configure mode field editor"
```

---

### Task 14: `SpecDataGrid` and mode switching in the studio

**Files:**
- Create: `src/components/spec/SpecDataGrid.tsx`
- Modify: `src/app/owner/settings/MasterSheetView.tsx`
- Modify: `src/app/owner/settings/master-data/page.tsx`

**Interfaces:**
- Consumes: `getResolvedFields` (Task 5), `SpecFieldEditor` (Task 13)
- Produces: `<SpecDataGrid group fields rows />`; the studio's tab list is read from `ItemGroup` where `isSheet = true`

- [ ] **Step 1: Implement the grid**

`src/components/spec/SpecDataGrid.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import type { SpecFieldShape } from "./SpecFieldInput";

export type SpecRow = {
  id: string;
  name: string;
  itemCode: string | null;
  aliasName: string | null;
  status: string;
  /** Display strings keyed by field key, pre-resolved on the server. */
  cells: Record<string, string>;
};

export function SpecDataGrid({
  fields, rows,
}: { fields: SpecFieldShape[]; rows: SpecRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name, r.aliasName, r.itemCode, ...Object.values(r.cells)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, query]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-neutral-200 p-2 dark:border-neutral-800">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, alias, code or any field…"
          className="w-80 rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <span className="text-xs text-neutral-500">{filtered.length} of {rows.length}</span>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-max min-w-full text-sm">
          <thead className="sticky top-0 bg-neutral-50 dark:bg-neutral-900">
            <tr>
              <th className="border-b px-3 py-2 text-left font-medium">Code</th>
              <th className="border-b px-3 py-2 text-left font-medium">Name</th>
              <th className="border-b px-3 py-2 text-left font-medium">Alias</th>
              {fields.map((f) => (
                <th key={f.id} className="border-b px-3 py-2 text-left font-medium whitespace-nowrap">
                  {f.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900">
                <td className="border-b px-3 py-1.5 font-mono text-xs">{r.itemCode}</td>
                <td className="border-b px-3 py-1.5 whitespace-nowrap">
                  {r.name}
                  {r.status === "DRAFT" && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                      DRAFT
                    </span>
                  )}
                </td>
                <td className="border-b px-3 py-1.5 text-neutral-500">{r.aliasName}</td>
                {fields.map((f) => (
                  <td key={f.id} className="border-b px-3 py-1.5 whitespace-nowrap">{r.cells[f.key] ?? ""}</td>
                ))}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3 + fields.length} className="px-3 py-8 text-center text-neutral-500">
                  Nothing here yet. Use “Add Master Data” to create the first item.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace the hardcoded tab array**

In `src/app/owner/settings/MasterSheetView.tsx`, find the literal tab list at approximately line 1464:

```tsx
{ id: "variantRules", label: "Vehicles" },
{ id: "designs", label: "Designs" },
...
{ id: "templates", label: "Templates" }
```

Replace it with a merge of the system tabs and the owner-defined item groups. The component now takes a `groups` prop:

```tsx
type StudioTab = { id: string; label: string; kind: "system" | "group" };

const SYSTEM_TABS: StudioTab[] = [
  { id: "variantRules", label: "Vehicles",  kind: "system" },
  { id: "designs",      label: "Designs",   kind: "system" },
  { id: "colors",       label: "Colors",    kind: "system" },
  { id: "suppliers",    label: "Suppliers", kind: "system" },
  { id: "customers",    label: "Customers", kind: "system" },
  { id: "locations",    label: "Locations", kind: "system" },
  { id: "templates",    label: "Templates", kind: "system" },
];

// Item tabs come from the group tree, so adding a group adds a tab.
const tabs: StudioTab[] = [
  ...groups.filter((g) => g.isSheet).map((g) => ({ id: g.id, label: g.name, kind: "group" as const })),
  ...SYSTEM_TABS,
];
```

Delete the `fabrics`, `items`, `products`, `variants` and `productTypes` tab entries and the branches of the render switch that served them.

- [ ] **Step 3: Add the mode toggle**

Above the sheet body, for `kind === "group"` tabs only:

```tsx
const [mode, setMode] = useState<"data" | "configure">("data");

<div className="inline-flex rounded-md border border-neutral-300 dark:border-neutral-700">
  {(["data", "configure"] as const).map((m) => (
    <button
      key={m}
      onClick={() => setMode(m)}
      className={`px-3 py-1.5 text-xs font-medium ${mode === m ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : ""}`}
    >
      {m === "data" ? "Data" : "Configure"}
    </button>
  ))}
</div>
```

Render `<SpecDataGrid />` when `mode === "data"` and `<SpecFieldEditor />` when `mode === "configure"`.

- [ ] **Step 4: Load groups in the page**

In `src/app/owner/settings/master-data/page.tsx`, call `listItemGroups()` and pass the result into `MasterSheetView`.

- [ ] **Step 5: Verify manually**

Run: `npm run typecheck && npm run dev`

Open `http://localhost:3000/owner/settings/master-data` and confirm:
- Six item tabs appear (Raw Material, Semi-Finished, Finished Good, Consumable, Packaging, Trading Goods) followed by the seven system tabs
- Fabrics, Items, Products, Variants and Spec Presets tabs are gone
- The Data/Configure toggle appears on item tabs only
- Configure mode lets you add a field, and it appears in the list
- Data mode shows an empty grid with the "Nothing here yet" message

- [ ] **Step 6: Commit**

```bash
git add src/components/spec/SpecDataGrid.tsx src/app/owner/settings/
git commit -m "feat(spec): generic data grid and group-driven studio tabs"
```

---

# Phase 4 — Add Master Data wizard

### Task 15: `createItemFromSpec`

**Files:**
- Modify: `src/server/actions/items.ts`

**Interfaces:**
- Consumes: `specHash` (Task 9), `renderTemplate` (Task 7), `resolveAnswers` (Task 8), `getResolvedFields` (Task 5)
- Produces: `createItemFromSpec(input): Promise<{ id: string } | { error: string }>` and `previewSpecName(groupId, answers): Promise<{ name: string; code: string }>`

- [ ] **Step 1: Implement**

Append to `src/server/actions/items.ts`:

```ts
import { specHash } from "@/lib/spec/hash";
import { renderTemplate } from "@/lib/spec/template";
import { resolveAnswers, type RawAnswer } from "@/lib/spec/resolve";
import { getResolvedFields } from "@/server/queries/spec";
import type { SpecAnswer } from "@/lib/spec/types";

/** The storage identity of one answer — what the hash consumes. */
function identityOf(a: SpecAnswer): string {
  return (
    a.optionId ?? a.valueItemId ?? a.valueRefId ??
    (a.valueNumber !== null && a.valueNumber !== undefined ? String(a.valueNumber) : null) ??
    (a.valueBool !== null && a.valueBool !== undefined ? String(a.valueBool) : null) ??
    a.valueText ?? ""
  );
}

/**
 * Load the display strings a set of answers renders to. Shared by the live
 * preview and by create, so the name the owner sees is the name that is stored.
 */
async function renderFromAnswers(groupId: string, answers: Record<string, SpecAnswer>) {
  const user = await getOwnerUser();
  const [group, fields] = await Promise.all([
    prisma.itemGroup.findFirst({ where: { id: groupId, factoryId: user.factoryId } }),
    getResolvedFields(groupId),
  ]);
  if (!group) return { name: "", code: "", fields: [], group: null };

  // Hydrate every reference so the templates can print labels.
  const itemIds = Object.values(answers).map((a) => a.valueItemId).filter(Boolean) as string[];
  const refIds = Object.values(answers).map((a) => a.valueRefId).filter(Boolean) as string[];

  const [items, brands, models, generations, designs, colors] = await Promise.all([
    itemIds.length ? prisma.itemMaster.findMany({ where: { id: { in: itemIds } }, select: { id: true, name: true, aliasName: true, itemCode: true } }) : [],
    refIds.length ? prisma.vehicleBrand.findMany({ where: { id: { in: refIds } } }) : [],
    refIds.length ? prisma.vehicleModel.findMany({ where: { id: { in: refIds } } }) : [],
    refIds.length ? prisma.vehicleGeneration.findMany({ where: { id: { in: refIds } } }) : [],
    refIds.length ? prisma.design.findMany({ where: { id: { in: refIds } } }) : [],
    refIds.length ? prisma.color.findMany({ where: { id: { in: refIds } } }) : [],
  ]);

  const itemById = new Map(items.map((i) => [i.id, i]));
  const labelById = new Map<string, string>();
  for (const r of brands) labelById.set(r.id, r.name);
  for (const r of models) labelById.set(r.id, r.name);
  for (const r of generations) labelById.set(r.id, r.name);
  for (const r of designs) labelById.set(r.id, r.category ? `${r.category} ${r.name}` : r.name);
  for (const r of colors) labelById.set(r.id, r.name);

  const raws: Record<string, RawAnswer> = {};
  for (const field of fields) {
    const a = answers[field.key];
    if (!a) continue;
    const option = a.optionId ? field.options.find((o) => o.id === a.optionId) ?? null : null;
    raws[field.key] = {
      valueText: a.valueText ?? null,
      valueNumber: a.valueNumber ?? null,
      valueBool: a.valueBool ?? null,
      option: option ? { label: option.label, shortCode: option.shortCode } : null,
      valueItem: a.valueItemId ? itemById.get(a.valueItemId) ?? null : null,
      refLabel: a.valueRefId ? labelById.get(a.valueRefId) ?? null : null,
      refCode: null,
    };
  }

  // {group} is always available, even though it is not a spec field.
  const resolved = resolveAnswers(fields as never, raws);
  resolved.group = { name: group.name, code: group.shortCode || group.name };

  return {
    name: renderTemplate(group.nameTemplate ?? "{group}", resolved, "name"),
    code: renderTemplate(group.codeTemplate ?? "{group}", resolved, "code"),
    fields,
    group,
  };
}

export async function previewSpecName(groupId: string, answers: Record<string, SpecAnswer>) {
  const { name, code } = await renderFromAnswers(groupId, answers);
  return { name, code };
}

export async function createItemFromSpec(input: {
  groupId: string;
  answers: Record<string, SpecAnswer>;
  defaultUOM: string;
  aliasName?: string | null;
  status?: "ACTIVE" | "DRAFT";
}) {
  const user = await getOwnerUser();
  const { name, code, fields, group } = await renderFromAnswers(input.groupId, input.answers);
  if (!group) return { error: "Unknown item group" };
  if (!name) return { error: "Fill at least one field before saving" };

  const missing = fields.filter((f) => f.isRequired && !input.answers[f.key]);
  if (missing.length) {
    return { error: `Missing required field: ${missing.map((f) => f.name).join(", ")}` };
  }

  const identities: Record<string, string> = {};
  for (const field of fields) {
    const a = input.answers[field.key];
    if (a) identities[field.key] = identityOf(a);
  }
  const hash = specHash(input.groupId, identities);

  const existing = await prisma.itemMaster.findFirst({
    where: { factoryId: user.factoryId, specHash: hash },
    select: { id: true, name: true },
  });
  if (existing) return { error: `Already exists: ${existing.name}` };

  const item = await prisma.$transaction(async (tx) => {
    const created = await tx.itemMaster.create({
      data: {
        factoryId: user.factoryId,
        groupId: input.groupId,
        itemType: group.itemType,
        name,
        itemCode: code,
        sku: code,
        aliasName: input.aliasName?.trim() || null,
        defaultUOM: input.defaultUOM,
        status: input.status ?? "ACTIVE",
        specHash: hash,
        manufacturingType: group.itemType === "RAW_MATERIAL" ? "BUY" : "MAKE",
      },
    });

    for (const field of fields) {
      const a = input.answers[field.key];
      if (!a) continue;
      await tx.itemFieldValue.create({
        data: {
          factoryId: user.factoryId,
          itemId: created.id,
          fieldId: field.id,
          valueText: a.valueText ?? null,
          valueNumber: a.valueNumber ?? null,
          valueBool: a.valueBool ?? null,
          optionId: a.optionId ?? null,
          valueItemId: a.valueItemId ?? null,
          valueRefId: a.valueRefId ?? null,
        },
      });
    }
    return created;
  });

  revalidatePath("/owner/settings/master-data");
  return { id: item.id };
}
```

- [ ] **Step 2: Verify and commit**

Run: `npm run typecheck`
Expected: passes.

```bash
git add src/server/actions/items.ts
git commit -m "feat(spec): create items from a spec with generated name, code and hash"
```

---

### Task 16: The wizard

**Files:**
- Create: `src/components/spec/NamePreviewBar.tsx`
- Create: `src/app/owner/settings/master-data/add/AddMasterDataClient.tsx`
- Create: `src/app/owner/settings/master-data/add/page.tsx`
- Modify: `src/app/owner/settings/MasterSheetView.tsx` (add the button)

**Interfaces:**
- Consumes: `previewSpecName`, `createItemFromSpec` (Task 15); `SpecFieldInput` (Task 12); `getReferenceOptions` (Task 10)
- Produces: route `/owner/settings/master-data/add`

- [ ] **Step 1: The preview bar**

`src/components/spec/NamePreviewBar.tsx`:

```tsx
"use client";

export function NamePreviewBar({ name, code }: { name: string; code: string }) {
  return (
    <div className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-50 px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="text-[11px] uppercase tracking-wide text-neutral-500">Item name</div>
      <div className="text-lg font-semibold">
        {name || <span className="text-neutral-400">Fill the fields below…</span>}
        {name && <span className="animate-pulse text-neutral-400">▊</span>}
      </div>
      <div className="mt-1 font-mono text-xs text-neutral-500">{code}</div>
    </div>
  );
}
```

- [ ] **Step 2: The wizard client**

`src/app/owner/settings/master-data/add/AddMasterDataClient.tsx`:

```tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { NamePreviewBar } from "@/components/spec/NamePreviewBar";
import { SpecFieldInput, type SpecAnswer, type SpecFieldShape } from "@/components/spec/SpecFieldInput";
import { getReferenceOptions, type RefOption } from "@/server/queries/spec";
import { previewSpecName, createItemFromSpec } from "@/server/actions/items";
import { UOM_SUGGESTIONS } from "@/lib/item-constants";

type Group = { id: string; name: string; parentId: string | null; isSheet: boolean };

export function AddMasterDataClient({ groups }: { groups: Group[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [rootId, setRootId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [fields, setFields] = useState<SpecFieldShape[]>([]);
  const [answers, setAnswers] = useState<Record<string, SpecAnswer>>({});
  const [options, setOptions] = useState<Record<string, RefOption[]>>({});
  const [preview, setPreview] = useState({ name: "", code: "" });
  const [uom, setUom] = useState("PCS");
  const [alias, setAlias] = useState("");
  const [error, setError] = useState<string | null>(null);

  const roots = groups.filter((g) => !g.parentId);
  const children = groups.filter((g) => g.parentId === rootId);

  // Fields for the chosen group.
  useEffect(() => {
    if (!groupId) return;
    fetch(`/api/spec/fields?groupId=${groupId}`)
      .then((r) => r.json())
      .then((f: SpecFieldShape[]) => { setFields(f); setAnswers({}); });
  }, [groupId]);

  // Reference options, refetched when a dependency's answer changes.
  useEffect(() => {
    for (const field of fields) {
      if (field.kind !== "REFERENCE") continue;
      const parent = fields.find((f) => f.id === field.dependsOnFieldId);
      const parentValue = parent
        ? answers[parent.key]?.valueRefId ?? answers[parent.key]?.valueItemId ?? undefined
        : undefined;
      if (field.dependsOnFieldId && !parentValue) {
        setOptions((o) => ({ ...o, [field.key]: [] }));
        continue;
      }
      getReferenceOptions(field.id, parentValue ?? undefined).then((opts) =>
        setOptions((o) => ({ ...o, [field.key]: opts }))
      );
    }
  }, [fields, answers]);

  // Live name/code.
  useEffect(() => {
    if (!groupId) return;
    previewSpecName(groupId, answers).then(setPreview);
  }, [groupId, answers]);

  function save() {
    if (!groupId) return;
    setError(null);
    start(async () => {
      const result = await createItemFromSpec({
        groupId, answers, defaultUOM: uom, aliasName: alias || null,
      });
      if ("error" in result) setError(result.error);
      else router.push("/owner/settings/master-data");
    });
  }

  if (!rootId) {
    return (
      <div className="p-8">
        <h1 className="mb-6 text-xl font-semibold">What are you adding?</h1>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {roots.map((g) => (
            <button key={g.id} onClick={() => setRootId(g.id)}
              className="rounded-lg border border-neutral-200 p-6 text-left text-lg font-medium hover:border-neutral-900 dark:border-neutral-800 dark:hover:border-white">
              {g.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!groupId) {
    const pickable = children.length ? children : roots.filter((g) => g.id === rootId);
    return (
      <div className="p-8">
        <button onClick={() => setRootId(null)} className="mb-4 text-sm text-neutral-500 hover:underline">← Back</button>
        <h1 className="mb-6 text-xl font-semibold">Which kind?</h1>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {pickable.map((g) => (
            <button key={g.id} onClick={() => setGroupId(g.id)}
              className="rounded-lg border border-neutral-200 p-4 text-left hover:border-neutral-900 dark:border-neutral-800 dark:hover:border-white">
              {g.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <NamePreviewBar name={preview.name} code={preview.code} />

      <div className="flex-1 overflow-auto p-6">
        {/* Wide horizontal layout — building a row, not filling a form. */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
          {fields.map((field) => {
            const parent = fields.find((f) => f.id === field.dependsOnFieldId);
            const blocked = Boolean(field.dependsOnFieldId && parent && !answers[parent.key]);
            return (
              <SpecFieldInput
                key={field.id}
                field={field}
                options={options[field.key] ?? []}
                value={answers[field.key] ?? {}}
                disabled={blocked}
                disabledReason={parent ? `Choose ${parent.name} first` : undefined}
                onChange={(next) => setAnswers((a) => ({ ...a, [field.key]: next }))}
              />
            );
          })}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 border-t border-neutral-200 pt-6 md:grid-cols-4 dark:border-neutral-800">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Alias (short name)</label>
            <input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="Beige"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Unit</label>
            <select value={uom} onChange={(e) => setUom(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
              {UOM_SUGGESTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>

      <div className="flex justify-end gap-2 border-t border-neutral-200 p-4 dark:border-neutral-800">
        <button onClick={() => setGroupId(null)} className="rounded-md px-4 py-2 text-sm">Back</button>
        <button onClick={save} disabled={pending || !preview.name}
          className="rounded-md bg-neutral-900 px-6 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900">
          {pending ? "Saving…" : "Save item"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: The page and the fields API route**

`src/app/owner/settings/master-data/add/page.tsx`:

```tsx
import { listItemGroups } from "@/server/actions/itemGroups";
import { AddMasterDataClient } from "./AddMasterDataClient";

export default async function AddMasterDataPage() {
  const groups = await listItemGroups();
  return <AddMasterDataClient groups={groups} />;
}
```

`src/app/api/spec/fields/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getResolvedFields } from "@/server/queries/spec";

export async function GET(req: NextRequest) {
  const groupId = req.nextUrl.searchParams.get("groupId");
  if (!groupId) return NextResponse.json([], { status: 400 });
  return NextResponse.json(await getResolvedFields(groupId));
}
```

- [ ] **Step 4: Add the button to the studio**

In `MasterSheetView.tsx`, next to the mode toggle:

```tsx
<Link href="/owner/settings/master-data/add"
  className="rounded-md bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-neutral-900">
  ＋ Add Master Data
</Link>
```

- [ ] **Step 5: Verify manually**

Run: `npm run typecheck && npm run dev`

In Configure mode on `Finished Good`, create these fields, then use the wizard:

| Field name | Kind | Target | Depends on |
|---|---|---|---|
| Brand | Reference | Vehicle brand | — |
| Model | Reference | Vehicle model | Brand |
| Generation | Reference | Vehicle generation | Model |
| Back Type | Option | options `SB`/`DB` with short codes | — |
| Headrests | Value (NUMBER) | suffix `HDR` | — |
| Colour | Reference | Colour | — |

Set the group's `nameTemplate` to `{group} {brand} {model} {generation} {backType} {headrests} {colour}` directly in Prisma Studio for now.

Confirm:
- Model is disabled until Brand is chosen, and its list narrows to that brand
- The preview bar fills in as each field is answered
- Arrow keys and Enter select in every reference dropdown
- Saving twice with identical answers returns "Already exists: …"

- [ ] **Step 6: Commit**

```bash
git add src/components/spec/NamePreviewBar.tsx src/app/owner/settings/master-data/add/ src/app/api/spec/fields/ src/app/owner/settings/MasterSheetView.tsx
git commit -m "feat(spec): add master data wizard with live name preview and cascading fields"
```

---

### Task 17: Inline reference creation

**Files:**
- Modify: `src/app/owner/settings/master-data/add/AddMasterDataClient.tsx`
- Create: `src/components/spec/InlineCreateDialog.tsx`

**Interfaces:**
- Consumes: `createItemFromSpec`, `getReferenceOptions`, existing `addBrand`/`addModelByName`/`addColor` from `masterData.ts`
- Produces: `<InlineCreateDialog field query onCreated onCancel />`

- [ ] **Step 1: Implement the dialog**

`src/components/spec/InlineCreateDialog.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { addBrand, addColor } from "@/server/actions/masterData";
import { createItemFromSpec } from "@/server/actions/items";
import type { SpecFieldShape } from "./SpecFieldInput";

/**
 * Creates the missing target of a reference field without leaving the wizard.
 * Item targets go through the spec engine; attribute masters use their
 * existing single-field actions.
 */
export function InlineCreateDialog({
  field, query, onCreated, onCancel,
}: {
  field: SpecFieldShape;
  query: string;
  onCreated: (id: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(query);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    start(async () => {
      if (field.refTarget === "VEHICLE_BRAND") {
        await addBrand(name);
        onCreated("");           // parent refetches; brand ids are not returned
        return;
      }
      if (field.refTarget === "COLOR") {
        await addColor(name);
        onCreated("");
        return;
      }
      if (field.refTarget === "ITEM_GROUP" && field.targetGroupId) {
        const result = await createItemFromSpec({
          groupId: field.targetGroupId,
          answers: {},
          defaultUOM: "PCS",
          aliasName: name,
        });
        if ("error" in result) { setError(result.error); return; }
        onCreated(result.id);
        return;
      }
      setError(`Add a ${field.name.toLowerCase()} from its own sheet first.`);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-96 rounded-lg bg-white p-6 shadow-xl dark:bg-neutral-900">
        <h3 className="mb-4 text-sm font-semibold">New {field.name}</h3>
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900" />
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-md px-3 py-1.5 text-sm">Cancel</button>
          <button onClick={submit} disabled={pending || !name.trim()}
            className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900">
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into the wizard**

In `AddMasterDataClient.tsx`, add state and pass `onCreate` through:

```tsx
const [creating, setCreating] = useState<{ field: SpecFieldShape; query: string } | null>(null);

// inside the SpecFieldInput map:
onCreate={(q) => setCreating({ field, query: q })}

// after the grid:
{creating && (
  <InlineCreateDialog
    field={creating.field}
    query={creating.query}
    onCancel={() => setCreating(null)}
    onCreated={(id) => {
      if (id) {
        setAnswers((a) => ({
          ...a,
          [creating.field.key]:
            creating.field.refTarget === "ITEM_GROUP" ? { valueItemId: id } : { valueRefId: id },
        }));
      }
      setCreating(null);
      // Force the options effect to refetch.
      setAnswers((a) => ({ ...a }));
    }}
  />
)}
```

- [ ] **Step 3: Verify manually**

Run: `npm run dev`

In the wizard, type a brand that does not exist into the Brand field. Confirm `＋ Add "…"` appears, the dialog opens, creating it closes the dialog, and the new brand appears in the dropdown.

- [ ] **Step 4: Commit**

```bash
git add src/components/spec/InlineCreateDialog.tsx src/app/owner/settings/master-data/add/
git commit -m "feat(spec): inline creation of missing reference targets from the wizard"
```

---

# Phase 5 — CSV

### Task 18: CSV schema helpers

**Files:**
- Create: `src/lib/csv/schema.ts`
- Create: `src/lib/csv/schema.test.ts`

**Interfaces:**
- Consumes: `SpecFieldShape`
- Produces: `csvHeader(fields)`, `csvSampleRow(fields)`, `csvOptionSheet(fields)`, `parseCsvRow(fields, row)`

- [ ] **Step 1: Write the failing tests**

`src/lib/csv/schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { csvHeader, csvSampleRow, csvOptionSheet, parseCsvRow } from "./schema";

const fields = [
  { key: "brand", name: "Brand", kind: "REFERENCE" as const, options: [] },
  { key: "backType", name: "Back Type", kind: "OPTION" as const,
    options: [{ id: "o1", label: "Single Back", shortCode: "SB" }, { id: "o2", label: "Double Back", shortCode: "DB" }] },
  { key: "headrests", name: "Headrests", kind: "VALUE" as const, options: [] },
];

describe("csvHeader", () => {
  it("starts with the fixed columns then one column per field", () => {
    expect(csvHeader(fields)).toEqual(["Alias", "Unit", "Brand", "Back Type", "Headrests"]);
  });
});

describe("csvSampleRow", () => {
  it("fills each field with a usable example", () => {
    const row = csvSampleRow(fields);
    expect(row[0]).toBe("Short name");
    expect(row[1]).toBe("PCS");
    expect(row[3]).toBe("Single Back");
  });

  it("has the same length as the header", () => {
    expect(csvSampleRow(fields)).toHaveLength(csvHeader(fields).length);
  });
});

describe("csvOptionSheet", () => {
  it("lists valid values only for option fields", () => {
    expect(csvOptionSheet(fields)).toEqual([
      ["Back Type", "Single Back"],
      ["Back Type", "Double Back"],
    ]);
  });
});

describe("parseCsvRow", () => {
  it("maps header columns back onto field keys", () => {
    const parsed = parseCsvRow(fields, {
      Alias: "Beige", Unit: "MTR", Brand: "Maruti", "Back Type": "Double Back", Headrests: "4",
    });
    expect(parsed).toEqual({
      aliasName: "Beige",
      unit: "MTR",
      values: { brand: "Maruti", backType: "Double Back", headrests: "4" },
    });
  });

  it("treats missing columns as empty rather than throwing", () => {
    const parsed = parseCsvRow(fields, { Alias: "X" });
    expect(parsed.values.brand).toBe("");
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test`
Expected: FAIL — cannot resolve `./schema`.

- [ ] **Step 3: Implement**

`src/lib/csv/schema.ts`:

```ts
type CsvField = {
  key: string;
  name: string;
  kind: "VALUE" | "OPTION" | "REFERENCE";
  options: { id: string; label: string; shortCode: string | null }[];
};

const FIXED = ["Alias", "Unit"];

/** Header row: fixed columns, then one per spec field, in field order. */
export function csvHeader(fields: CsvField[]): string[] {
  return [...FIXED, ...fields.map((f) => f.name)];
}

/** One filled example row so the owner can see the expected shape. */
export function csvSampleRow(fields: CsvField[]): string[] {
  return [
    "Short name",
    "PCS",
    ...fields.map((f) => {
      if (f.kind === "OPTION") return f.options[0]?.label ?? "";
      if (f.kind === "REFERENCE") return "Existing name or alias";
      return "";
    }),
  ];
}

/** Second sheet of the template: every valid value for each option field. */
export function csvOptionSheet(fields: CsvField[]): string[][] {
  const rows: string[][] = [];
  for (const field of fields) {
    if (field.kind !== "OPTION") continue;
    for (const option of field.options) rows.push([field.name, option.label]);
  }
  return rows;
}

/** Turn one parsed CSV record back into field keys. */
export function parseCsvRow(fields: CsvField[], row: Record<string, string>) {
  const values: Record<string, string> = {};
  for (const field of fields) values[field.key] = (row[field.name] ?? "").trim();
  return {
    aliasName: (row.Alias ?? "").trim(),
    unit: (row.Unit ?? "").trim() || "PCS",
    values,
  };
}
```

- [ ] **Step 4: Run and confirm passing**

Run: `npm test`
Expected: PASS — 36 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/csv/
git commit -m "feat(csv): header, sample and parse helpers driven by spec fields"
```

---

### Task 19: CSV export, template and import

**Files:**
- Create: `src/server/actions/specCsv.ts`
- Modify: `src/components/spec/SpecDataGrid.tsx` (toolbar buttons)

**Interfaces:**
- Consumes: `csvHeader`, `csvSampleRow`, `csvOptionSheet`, `parseCsvRow` (Task 18); `createItemFromSpec` (Task 15)
- Produces: `exportGroupCsv(groupId)`, `templateGroupCsv(groupId)`, `importGroupCsv(groupId, csv, commit)`

- [ ] **Step 1: Implement the actions**

`src/server/actions/specCsv.ts`:

```ts
"use server";

import Papa from "papaparse";
import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { getResolvedFields, getReferenceOptions } from "@/server/queries/spec";
import { csvHeader, csvSampleRow, csvOptionSheet, parseCsvRow } from "@/lib/csv/schema";
import { createItemFromSpec } from "./items";

export async function exportGroupCsv(groupId: string) {
  const user = await getOwnerUser();
  const fields = await getResolvedFields(groupId);
  const items = await prisma.itemMaster.findMany({
    where: { factoryId: user.factoryId, groupId },
    include: { specValues: { include: { option: true, valueItem: true } } },
    orderBy: { name: "asc" },
  });

  const rows = items.map((item) => {
    const byField = new Map(item.specValues.map((v) => [v.fieldId, v]));
    return [
      item.aliasName ?? "",
      item.defaultUOM,
      ...fields.map((f) => {
        const v = byField.get(f.id);
        if (!v) return "";
        if (v.option) return v.option.label;
        if (v.valueItem) return v.valueItem.aliasName || v.valueItem.name;
        if (v.valueNumber !== null) return String(v.valueNumber);
        if (v.valueBool !== null) return v.valueBool ? "Yes" : "No";
        return v.valueText ?? "";
      }),
    ];
  });

  return Papa.unparse([csvHeader(fields), ...rows]);
}

export async function templateGroupCsv(groupId: string) {
  await getOwnerUser();
  const fields = await getResolvedFields(groupId);
  const main = Papa.unparse([csvHeader(fields), csvSampleRow(fields)]);
  const options = csvOptionSheet(fields);
  if (options.length === 0) return main;
  // A second block, since a single CSV cannot carry two sheets.
  return `${main}\n\n# Valid values\nField,Value\n${Papa.unparse(options)}`;
}

export type ImportIssue = { row: number; column: string; message: string };
export type ImportResult = { created: number; issues: ImportIssue[] };

/**
 * Import rows into a group. Runs as a dry run unless `commit` is true, so the
 * owner always sees the issues before anything is written.
 */
export async function importGroupCsv(
  groupId: string,
  csv: string,
  commit: boolean
): Promise<ImportResult> {
  await getOwnerUser();
  const fields = await getResolvedFields(groupId);
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });

  // Resolve every reference field's options once, by lowercased label.
  const refLookup = new Map<string, Map<string, string>>();
  for (const field of fields) {
    if (field.kind !== "REFERENCE") continue;
    const opts = await getReferenceOptions(field.id);
    refLookup.set(field.key, new Map(opts.map((o) => [o.label.toLowerCase(), o.id])));
  }

  const issues: ImportIssue[] = [];
  let created = 0;

  for (const [index, record] of parsed.data.entries()) {
    const rowNo = index + 2; // header is row 1
    const { aliasName, unit, values } = parseCsvRow(fields as never, record);
    const answers: Record<string, Record<string, unknown>> = {};
    let rowFailed = false;

    for (const field of fields) {
      const raw = values[field.key];
      if (!raw) {
        if (field.isRequired) {
          issues.push({ row: rowNo, column: field.name, message: "Required value is empty" });
          rowFailed = true;
        }
        continue;
      }

      if (field.kind === "OPTION") {
        const option = field.options.find((o) => o.label.toLowerCase() === raw.toLowerCase());
        if (!option) {
          issues.push({ row: rowNo, column: field.name, message: `"${raw}" is not a valid option` });
          rowFailed = true;
        } else {
          answers[field.key] = { optionId: option.id };
        }
      } else if (field.kind === "REFERENCE") {
        const id = refLookup.get(field.key)?.get(raw.toLowerCase());
        if (!id) {
          issues.push({ row: rowNo, column: field.name, message: `"${raw}" not found` });
          rowFailed = true;
        } else {
          answers[field.key] =
            field.refTarget === "ITEM_GROUP" ? { valueItemId: id } : { valueRefId: id };
        }
      } else if (field.valueType === "NUMBER" || field.valueType === "MEASUREMENT") {
        const n = Number(raw);
        if (Number.isNaN(n)) {
          issues.push({ row: rowNo, column: field.name, message: `"${raw}" is not a number` });
          rowFailed = true;
        } else {
          answers[field.key] = { valueNumber: n };
        }
      } else {
        answers[field.key] = { valueText: raw };
      }
    }

    if (rowFailed) continue;

    if (commit) {
      const result = await createItemFromSpec({
        groupId, answers: answers as never, defaultUOM: unit, aliasName,
      });
      if ("error" in result) issues.push({ row: rowNo, column: "—", message: result.error });
      else created++;
    } else {
      created++;
    }
  }

  return { created, issues };
}
```

- [ ] **Step 2: Add the toolbar**

In `SpecDataGrid.tsx`, next to the search box:

```tsx
<button onClick={() => download(exportGroupCsv, `${groupName}.csv`)} className="text-xs hover:underline">Export</button>
<button onClick={() => download(templateGroupCsv, `${groupName}-template.csv`)} className="text-xs hover:underline">Template</button>
<label className="cursor-pointer text-xs hover:underline">
  Import
  <input type="file" accept=".csv" className="hidden" onChange={onFile} />
</label>
```

with helpers in the same file:

```tsx
async function download(fn: (id: string) => Promise<string>, filename: string) {
  const csv = await fn(groupId);
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;
  const csv = await file.text();
  const dry = await importGroupCsv(groupId, csv, false);
  const ok = confirm(
    `${dry.created} rows will be created.\n${dry.issues.length} issues.\n\n` +
    dry.issues.slice(0, 10).map((i) => `Row ${i.row} · ${i.column}: ${i.message}`).join("\n") +
    `\n\nProceed?`
  );
  if (ok) await importGroupCsv(groupId, csv, true);
}
```

- [ ] **Step 3: Verify manually**

Run: `npm run dev`

On a group with items: click Export and confirm the CSV opens with the right columns. Click Template and confirm it has one sample row plus a valid-values block. Import the exported file and confirm the dry run reports every row as a duplicate rather than creating anything.

- [ ] **Step 4: Commit**

```bash
git add src/server/actions/specCsv.ts src/components/spec/SpecDataGrid.tsx
git commit -m "feat(csv): per-group export, template download and dry-run import"
```

---

# Phase 6 — BOM

### Task 20: BOM template model and expansion

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/spec/bom.ts`
- Create: `src/lib/spec/bom.test.ts`

**Interfaces:**
- Consumes: `ItemGroup`, `SpecField`, `ItemMaster`
- Produces: model `BomTemplateLine`; `expandBomTemplate(lines, answers, context): BomLine[]`

- [ ] **Step 1: Add the model**

```prisma
/// A line in a group's BOM recipe. Either a fixed item, or the item answered
/// in a reference field.
model BomTemplateLine {
  id        String    @id @default(cuid())
  factoryId String
  groupId   String
  group     ItemGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)

  /// Fixed component.
  itemId String?
  item   ItemMaster? @relation("BomTemplateItem", fields: [itemId], references: [id], onDelete: Restrict)

  /// Component taken from a reference field's answer.
  sourceFieldId String?
  sourceField   SpecField? @relation(fields: [sourceFieldId], references: [id], onDelete: Cascade)

  quantity     Float   @default(1)
  /// When set, quantity comes from the named source instead of the fixed value.
  /// Supported: "design.fabricConsumption".
  quantityFrom String?
  wastePercent Float   @default(0)
  sortOrder    Int     @default(0)

  @@index([factoryId])
}
```

Add back-relations to `ItemGroup` (`bomTemplateLines BomTemplateLine[]`), `SpecField` (`bomLines BomTemplateLine[]`), and `ItemMaster` (`bomTemplateLines BomTemplateLine[] @relation("BomTemplateItem")`).

Run: `npx prisma db push`

- [ ] **Step 2: Write the failing tests**

`src/lib/spec/bom.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { expandBomTemplate } from "./bom";

const answers = { fabric: { valueItemId: "item-leatherite" } };
const context = { "design.fabricConsumption": 2.5 };

describe("expandBomTemplate", () => {
  it("emits a fixed line as-is", () => {
    const lines = [{ itemId: "thread", sourceFieldKey: null, quantity: 1, quantityFrom: null, wastePercent: 0 }];
    expect(expandBomTemplate(lines, answers, context)).toEqual([
      { itemId: "thread", quantity: 1, wastePercent: 0 },
    ]);
  });

  it("resolves the component from a reference field answer", () => {
    const lines = [{ itemId: null, sourceFieldKey: "fabric", quantity: 1, quantityFrom: null, wastePercent: 0 }];
    expect(expandBomTemplate(lines, answers, context)).toEqual([
      { itemId: "item-leatherite", quantity: 1, wastePercent: 0 },
    ]);
  });

  it("takes the quantity from the context when quantityFrom is set", () => {
    const lines = [{ itemId: null, sourceFieldKey: "fabric", quantity: 1, quantityFrom: "design.fabricConsumption", wastePercent: 5 }];
    expect(expandBomTemplate(lines, answers, context)).toEqual([
      { itemId: "item-leatherite", quantity: 2.5, wastePercent: 5 },
    ]);
  });

  it("skips a line whose source field is unanswered", () => {
    const lines = [{ itemId: null, sourceFieldKey: "lining", quantity: 1, quantityFrom: null, wastePercent: 0 }];
    expect(expandBomTemplate(lines, answers, context)).toEqual([]);
  });

  it("skips a line whose quantityFrom is missing from the context", () => {
    const lines = [{ itemId: "thread", sourceFieldKey: null, quantity: 1, quantityFrom: "design.missing", wastePercent: 0 }];
    expect(expandBomTemplate(lines, answers, context)).toEqual([]);
  });

  it("merges duplicate components by summing quantity", () => {
    const lines = [
      { itemId: "thread", sourceFieldKey: null, quantity: 1, quantityFrom: null, wastePercent: 0 },
      { itemId: "thread", sourceFieldKey: null, quantity: 2, quantityFrom: null, wastePercent: 0 },
    ];
    expect(expandBomTemplate(lines, answers, context)).toEqual([
      { itemId: "thread", quantity: 3, wastePercent: 0 },
    ]);
  });
});
```

- [ ] **Step 3: Run and confirm failure**

Run: `npm test`
Expected: FAIL — cannot resolve `./bom`.

- [ ] **Step 4: Implement**

`src/lib/spec/bom.ts`:

```ts
export type BomTemplateLineShape = {
  itemId: string | null;
  sourceFieldKey: string | null;
  quantity: number;
  quantityFrom: string | null;
  wastePercent: number;
};

export type BomLine = { itemId: string; quantity: number; wastePercent: number };

/**
 * Turn a group's BOM template into concrete lines for one item's answers.
 *
 * A line resolves its component from `itemId` or from the item answered in
 * `sourceFieldKey`. A line whose component or computed quantity cannot be
 * resolved is dropped rather than emitted with a wrong value — a missing line
 * is visible to the owner; a silently wrong quantity is not.
 */
export function expandBomTemplate(
  lines: BomTemplateLineShape[],
  answers: Record<string, { valueItemId?: string | null }>,
  context: Record<string, number>
): BomLine[] {
  const merged = new Map<string, BomLine>();

  for (const line of lines) {
    const itemId = line.itemId ?? (line.sourceFieldKey ? answers[line.sourceFieldKey]?.valueItemId ?? null : null);
    if (!itemId) continue;

    let quantity = line.quantity;
    if (line.quantityFrom) {
      const fromContext = context[line.quantityFrom];
      if (fromContext === undefined) continue;
      quantity = fromContext;
    }

    const existing = merged.get(itemId);
    if (existing) existing.quantity += quantity;
    else merged.set(itemId, { itemId, quantity, wastePercent: line.wastePercent });
  }

  return [...merged.values()];
}
```

- [ ] **Step 5: Run and confirm passing**

Run: `npm test`
Expected: PASS — 42 tests.

- [ ] **Step 6: Commit**

```bash
git add prisma/ src/lib/spec/bom.ts src/lib/spec/bom.test.ts
git commit -m "feat(bom): group BOM templates and expansion against spec answers"
```

---

### Task 21: BOM and Used-In views

**Files:**
- Modify: `src/server/queries/spec.ts`
- Create: `src/app/owner/settings/master-data/item/[id]/page.tsx`
- Create: `src/app/owner/settings/master-data/item/[id]/ItemDetailClient.tsx`

**Interfaces:**
- Consumes: `expandBomTemplate` (Task 20)
- Produces: `getItemBom(itemId)`, `getItemUsedIn(itemId)`; route `/owner/settings/master-data/item/[id]`

- [ ] **Step 1: Add the queries**

Append to `src/server/queries/spec.ts`:

```ts
import { expandBomTemplate } from "@/lib/spec/bom";

/** The recipe for an item. Empty for BUY items — they have no recipe. */
export async function getItemBom(itemId: string) {
  const user = await getOwnerUser();
  const item = await prisma.itemMaster.findFirst({
    where: { id: itemId, factoryId: user.factoryId },
    include: { specValues: { include: { field: true } } },
  });
  if (!item || item.manufacturingType === "BUY" || !item.groupId) return [];

  const lines = await prisma.bomTemplateLine.findMany({
    where: { groupId: item.groupId },
    include: { sourceField: true },
    orderBy: { sortOrder: "asc" },
  });

  const answers: Record<string, { valueItemId?: string | null }> = {};
  for (const v of item.specValues) answers[v.field.key] = { valueItemId: v.valueItemId };

  // Only design-driven consumption is supported today; see BomTemplateLine.quantityFrom.
  const designRefId = item.specValues.find((v) => v.field.refTarget === "DESIGN")?.valueRefId;
  const design = designRefId
    ? await prisma.design.findUnique({ where: { id: designRefId }, select: { fabricConsumption: true } })
    : null;
  const context: Record<string, number> = {};
  if (design?.fabricConsumption) context["design.fabricConsumption"] = design.fabricConsumption;

  const expanded = expandBomTemplate(
    lines.map((l) => ({
      itemId: l.itemId,
      sourceFieldKey: l.sourceField?.key ?? null,
      quantity: l.quantity,
      quantityFrom: l.quantityFrom,
      wastePercent: l.wastePercent,
    })),
    answers,
    context
  );

  const components = await prisma.itemMaster.findMany({
    where: { id: { in: expanded.map((e) => e.itemId) } },
    select: { id: true, name: true, itemCode: true, defaultUOM: true },
  });
  const byId = new Map(components.map((c) => [c.id, c]));
  return expanded.map((e) => ({ ...e, component: byId.get(e.itemId) ?? null }));
}

/** Everything this item is a component of — including consumables. */
export async function getItemUsedIn(itemId: string) {
  const user = await getOwnerUser();
  const values = await prisma.itemFieldValue.findMany({
    where: { factoryId: user.factoryId, valueItemId: itemId },
    include: { item: { select: { id: true, name: true, itemCode: true } } },
  });
  const seen = new Set<string>();
  return values
    .map((v) => v.item)
    .filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
}
```

- [ ] **Step 2: Build the detail page**

`src/app/owner/settings/master-data/item/[id]/page.tsx`:

```tsx
import prisma from "@/lib/prisma";
import { getItemBom, getItemUsedIn } from "@/server/queries/spec";
import { ItemDetailClient } from "./ItemDetailClient";

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, bom, usedIn] = await Promise.all([
    prisma.itemMaster.findUnique({
      where: { id },
      include: { group: true, specValues: { include: { field: true, option: true, valueItem: true } } },
    }),
    getItemBom(id),
    getItemUsedIn(id),
  ]);
  if (!item) return <div className="p-8">Item not found.</div>;
  return <ItemDetailClient item={item} bom={bom} usedIn={usedIn} />;
}
```

`ItemDetailClient.tsx` renders three sections: the spec answers as a definition list, the BOM table (hidden when `manufacturingType === "BUY"`), and the Used In list.

```tsx
"use client";

export function ItemDetailClient({ item, bom, usedIn }: { item: any; bom: any[]; usedIn: any[] }) {
  return (
    <div className="space-y-8 p-8">
      <header>
        <h1 className="text-xl font-semibold">{item.name}</h1>
        <p className="font-mono text-xs text-neutral-500">{item.itemCode}</p>
      </header>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Spec</h2>
        <dl className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
          {item.specValues.map((v: any) => (
            <div key={v.id}>
              <dt className="text-xs text-neutral-500">{v.field.name}</dt>
              <dd>{v.option?.label ?? v.valueItem?.name ?? v.valueText ?? v.valueNumber ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </section>

      {item.manufacturingType !== "BUY" && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Bill of materials</h2>
          {bom.length === 0 ? (
            <p className="text-sm text-neutral-500">No BOM template on {item.group?.name}.</p>
          ) : (
            <table className="text-sm">
              <tbody>
                {bom.map((l) => (
                  <tr key={l.itemId}>
                    <td className="py-1 pr-6">{l.component?.name ?? l.itemId}</td>
                    <td className="py-1 pr-6">{l.quantity} {l.component?.defaultUOM}</td>
                    <td className="py-1 text-neutral-500">{l.wastePercent}% waste</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold">Used in ({usedIn.length})</h2>
        <ul className="text-sm">
          {usedIn.map((i) => <li key={i.id}>{i.name}</li>)}
          {usedIn.length === 0 && <li className="text-neutral-500">Not used by any item yet.</li>}
        </ul>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Link rows from the grid**

In `SpecDataGrid.tsx`, wrap the name cell in `<Link href={`/owner/settings/master-data/item/${r.id}`}>`.

- [ ] **Step 4: Verify manually**

Run: `npm run dev`

Open a finished-good item and confirm: the spec answers list, a BOM section (empty until a template exists), and a Used In section. Open a raw material and confirm the BOM section is hidden and Used In lists the finished goods that reference it.

- [ ] **Step 5: Commit**

```bash
git add src/server/queries/spec.ts src/app/owner/settings/master-data/item/ src/components/spec/SpecDataGrid.tsx
git commit -m "feat(bom): item detail with generated BOM and used-in graph"
```

---

# Phase 7 — Finished goods become items

### Task 22: Backfill `ProductVariant.itemId` and retire the Variants tab

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `scripts/migrate_variants_to_items.mjs`
- Modify: `src/server/actions/masterData.ts`
- Modify: `src/app/owner/settings/MasterSheetView.tsx`

**Interfaces:**
- Consumes: `ItemGroup`, `createItemFromSpec`
- Produces: every `ProductVariant` has a backing `ItemMaster`; `addVariant`/`removeVariant`/`updateVariant`/`addProduct`/`addProductSimple`/`removeProduct`/`updateProduct` deleted

- [ ] **Step 1: Write the migration script**

`scripts/migrate_variants_to_items.mjs`:

```js
// Gives every ProductVariant a backing ItemMaster of type FINISHED_PRODUCT.
// Data is mock, so this is a convenience rather than a guaranteed-safe backfill.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const factories = await prisma.factory.findMany({ select: { id: true } });

for (const factory of factories) {
  const group = await prisma.itemGroup.findFirst({
    where: { factoryId: factory.id, itemType: "FINISHED_PRODUCT", parentId: null },
  });
  if (!group) {
    console.log(`no Finished Good group for factory ${factory.id}, skipping`);
    continue;
  }

  const variants = await prisma.productVariant.findMany({
    where: { itemId: null, product: { factoryId: factory.id } },
    include: { product: true },
  });

  for (const variant of variants) {
    const item = await prisma.itemMaster.create({
      data: {
        factoryId: factory.id,
        groupId: group.id,
        itemType: "FINISHED_PRODUCT",
        manufacturingType: "MAKE",
        name: `${variant.product.name} ${variant.name}`.trim(),
        sku: variant.sku,
        itemCode: variant.sku,
        defaultUOM: "PCS",
      },
    });
    await prisma.productVariant.update({ where: { id: variant.id }, data: { itemId: item.id } });
    console.log(`linked ${variant.sku} -> ${item.id}`);
  }
}

await prisma.$disconnect();
```

- [ ] **Step 2: Run it**

Run: `npm run db:reset && node scripts/migrate_variants_to_items.mjs`
Expected: one "linked …" line per variant, no errors.

- [ ] **Step 3: Make the link required**

In `prisma/schema.prisma`, change `ProductVariant`:

```prisma
  itemId String     @unique
  item   ItemMaster @relation(fields: [itemId], references: [id], onDelete: Restrict)
```

Add the back-relation on `ItemMaster`: `productVariant ProductVariant?`

Run: `npx prisma db push`
Expected: applied. If it fails on nulls, re-run step 2 first.

- [ ] **Step 4: Delete the dead actions and tab**

In `src/server/actions/masterData.ts`, delete `addProduct`, `addProductSimple`, `removeProduct`, `updateProduct`, `addVariant`, `removeVariant`, `updateVariant`, `addMaterialCategory`, `removeMaterialCategory`, `addMaterialSubcategory`, `updateMaterialSubcategory`, `removeMaterialSubcategory`, `addMaterial`, `removeMaterial`, `addCatalogItem`, `seedMasterDefaults` and `DEFAULT_CATEGORY_TREE`.

In `MasterSheetView.tsx`, delete the `products`, `variants`, `fabrics`, `items` and `productTypes` render branches and their column definitions (roughly lines 144–176).

- [ ] **Step 5: Verify**

Run: `npm run typecheck && npm run build`
Expected: both pass. Fix any import of a deleted action by removing the call site — none of them have a UI left.

- [ ] **Step 6: Commit**

```bash
git add prisma/ scripts/ src/server/actions/masterData.ts src/app/owner/settings/MasterSheetView.tsx
git commit -m "feat(spec): back finished goods with items, retire variant and product sheets"
```

---

### Task 23: Move blueprints onto items

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/app/owner/settings/blueprint/[variantId]/page.tsx`

**Interfaces:**
- Consumes: `ProductVariant.itemId` (Task 22)
- Produces: `Blueprint.itemId` replaces `Blueprint.productVariantId`

- [ ] **Step 1: Repoint the relation**

In `prisma/schema.prisma`, change `Blueprint`:

```prisma
model Blueprint {
  id              String     @id @default(cuid())
  factoryId       String
  itemId          String     @unique
  item            ItemMaster @relation(fields: [itemId], references: [id], onDelete: Cascade)
  activeVersionId String?

  versions BlueprintVersion[]
}
```

Remove `blueprint Blueprint?` from `ProductVariant` and add `blueprint Blueprint?` to `ItemMaster`.

- [ ] **Step 2: Reset rather than migrate**

Blueprint data is mock. Run:

```bash
npx prisma db push
npm run db:reset
node scripts/migrate_variants_to_items.mjs
```

Expected: schema applied, database re-seeded.

- [ ] **Step 3: Update the route**

Rename `src/app/owner/settings/blueprint/[variantId]/` to `src/app/owner/settings/blueprint/[itemId]/` and change the page's lookup from `productVariant` to `itemMaster`, and `BlueprintBuilderClient`'s `variantId` prop to `itemId`.

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run build`
Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add prisma/ src/app/owner/settings/blueprint/
git commit -m "refactor(spec): attach blueprints to items instead of product variants"
```

---

# Phase 8 — On-demand drafts

### Task 24: Draft items from the order studio

**Files:**
- Modify: `src/server/actions/items.ts`
- Modify: `src/components/spec/SpecDataGrid.tsx`
- Create: `src/server/actions/itemDrafts.ts`

**Interfaces:**
- Consumes: `createItemFromSpec` (Task 15)
- Produces: `mintDraftItem(groupId, answers)`, `promoteDraftItem(id)`, `listDraftItems()`

- [ ] **Step 1: Add the actions**

`src/server/actions/itemDrafts.ts`:

```ts
"use server";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { revalidatePath } from "next/cache";
import { createItemFromSpec } from "./items";
import type { SpecAnswer } from "@/lib/spec/types";

/**
 * Create an item from the order studio when a customer wants something not in
 * the catalog. It is immediately usable and produceable; the DRAFT status only
 * marks it for the owner's review.
 *
 * If the spec already matches an item, that item is returned instead — the
 * order proceeds either way and no duplicate is created.
 */
export async function mintDraftItem(groupId: string, answers: Record<string, SpecAnswer>) {
  const result = await createItemFromSpec({
    groupId, answers, defaultUOM: "PCS", status: "DRAFT",
  });
  if ("id" in result) return result;

  const user = await getOwnerUser();
  const existing = await prisma.itemMaster.findFirst({
    where: { factoryId: user.factoryId, groupId, name: result.error.replace("Already exists: ", "") },
    select: { id: true },
  });
  return existing ? { id: existing.id } : result;
}

export async function listDraftItems() {
  const user = await getOwnerUser();
  return prisma.itemMaster.findMany({
    where: { factoryId: user.factoryId, status: "DRAFT" },
    include: { group: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function promoteDraftItem(id: string) {
  const user = await getOwnerUser();
  await prisma.itemMaster.update({
    where: { id, factoryId: user.factoryId },
    data: { status: "ACTIVE" },
  });
  revalidatePath("/owner/settings/master-data");
}
```

- [ ] **Step 2: Surface drafts in the grid**

In `SpecDataGrid.tsx`, add a filter chip above the table:

```tsx
const [onlyDrafts, setOnlyDrafts] = useState(false);

<button
  onClick={() => setOnlyDrafts((v) => !v)}
  className={`rounded-full px-3 py-1 text-xs ${onlyDrafts ? "bg-amber-100 text-amber-800" : "text-neutral-500"}`}
>
  Drafts only ({rows.filter((r) => r.status === "DRAFT").length})
</button>
```

and include `onlyDrafts` in the `filtered` memo:

```tsx
const base = onlyDrafts ? rows.filter((r) => r.status === "DRAFT") : rows;
```

Add a Promote button in each draft row that calls `promoteDraftItem(r.id)`.

- [ ] **Step 3: Verify manually**

Run: `npm run dev`

Call `mintDraftItem` from the order studio path (or temporarily from a page) with a new answer set. Confirm the item appears in the grid with a DRAFT badge, that "Drafts only" filters to it, and that Promote clears the badge.

- [ ] **Step 4: Commit**

```bash
git add src/server/actions/itemDrafts.ts src/components/spec/SpecDataGrid.tsx
git commit -m "feat(spec): on-demand draft items with owner promotion"
```

---

### Task 25: Point the order studio at items

**Files:**
- Modify: `src/app/owner/production/client.tsx` (`OrdersClient`)
- Modify: `src/server/actions/orders.ts` (`getMasterData`)
- Modify: `prisma/schema.prisma`

**Read this first.** `src/app/owner/order-taking/page.tsx` does *not* contain the
order form — it renders `OrdersClient` from `src/app/owner/production/client.tsx`
with `mode="orderTaking"`. The same component serves order-taking and production.
Edit the shared client, and check both modes when verifying.

**Interfaces:**
- Consumes: `mintDraftItem` (Task 24), `SpecCombobox` (Task 11)
- Produces: `SalesOrder.itemId`

- [ ] **Step 1: Add the column**

In `prisma/schema.prisma`, on `SalesOrder`:

```prisma
  /// The finished-good item being ordered. Replaces the loose
  /// materialId/designId/colorId/vehicle* columns, which stay for now and are
  /// removed once the studio no longer writes them.
  itemId String?
  item   ItemMaster? @relation("OrderItem", fields: [itemId], references: [id], onDelete: SetNull)
```

Add `salesOrdersAsItem SalesOrder[] @relation("OrderItem")` to `ItemMaster`.

Run: `npx prisma db push`

- [ ] **Step 2: Serve finished-good items to the studio**

In `src/server/actions/orders.ts`, add to whatever `getMasterData()` returns:

```ts
finishedGoods: await prisma.itemMaster.findMany({
  where: {
    factoryId: user.factoryId,
    itemType: "FINISHED_PRODUCT",
    status: { in: ["ACTIVE", "DRAFT"] },
  },
  select: { id: true, name: true, aliasName: true, itemCode: true, groupId: true },
  orderBy: { name: "asc" },
}),
```

- [ ] **Step 3: Replace the studio's spec inputs with an item picker**

In `src/app/owner/production/client.tsx`, find the block that renders the
brand / model / design / fabric / colour selectors and replace it with:

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

`setMintingDraft(true)` opens the same spec form the wizard uses, pointed at the
Finished Good group, and calls `mintDraftItem(groupId, answers)` on submit;
its returned `id` becomes `itemId`.

Store the chosen item in `itemId` on submit. Leave `dynamicData` for
order-specific extras (remarks, special requests) and stop writing `materialId`,
`designId`, `colorId`, `productTypeId` and the `vehicle*` columns.

- [ ] **Step 4: Verify manually**

Run: `npm run dev`

Check **both** modes, since `OrdersClient` is shared:
- `/owner/order-taking` (store-manager mode) — book an order against an existing catalog item; confirm it saves with `itemId` set
- `/owner/production` (owner mode) — confirm the same picker appears and nothing else regressed

Then book an order for a spec that does not exist: confirm the draft is minted, the order saves, and the item appears under "Drafts only" in the Master Data Studio.

- [ ] **Step 5: Commit**

```bash
git add prisma/ src/app/owner/production/client.tsx src/server/actions/orders.ts
git commit -m "feat(orders): book orders against finished-good items"
```

---

### Task 26: Remove the dead order columns

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Consumes: Task 25
- Produces: `SalesOrder` without the parallel spec columns

- [ ] **Step 1: Confirm nothing reads them**

Run:

```bash
git grep -n "materialId\|designId\|colorId\|productTypeId\|vehicleBrandId\|vehicleModelId" -- src/
```

Expected: no hits outside `prisma/` and this plan. If any remain, fix those call sites before continuing.

- [ ] **Step 2: Drop the columns**

Remove from `SalesOrder`: `materialId`, `material`, `designId`, `design`, `colorId`, `color`, `productTypeId`, `productType`, `vehicleBrandId`, `vehicleBrand`, `vehicleModelId`, `vehicleModel`, `vehicleYear`, `seatType`, `hasArmrest`, `headrestCount`. Remove the matching back-relations from `ItemMaster` (`salesOrders @relation("OrderMaterial")`), `Design`, `Color`, `ProductType`, `VehicleBrand` and `VehicleModel`.

Delete the `ProductCombination` model entirely.

- [ ] **Step 3: Migrate and reseed**

```bash
npx prisma db push
npm run db:reset
node scripts/migrate_variants_to_items.mjs
```

- [ ] **Step 4: Verify**

Run: `npm test && npm run typecheck && npm run build`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add prisma/
git commit -m "refactor(orders): drop parallel spec columns and ProductCombination"
```

---

## Execution status (2026-07-27)

Tasks 1-25 are implemented on branch `updates`. 74 unit tests, typecheck and
build clean. Deviations, all recorded in the commits:

- **`db push`, not `migrate dev`, and no `db:reset`.** `DATABASE_URL` points at
  a hosted Supabase instance whose migration history is out of sync. The
  finished-goods merge was done in staged pushes (add nullable -> backfill ->
  make required) instead, so nothing was ever dropped.
- **Task 14 built a new screen** at `/owner/settings/master-data/studio` rather
  than retrofitting `MasterSheetView.tsx`, which has 65 references to a
  literal-union `activeSheet`. The legacy studio is untouched and still works.
- **Blueprint keeps its variant link** alongside the new item link. Dashboard,
  inspector and floor queries read `blueprint.productVariant` for product and
  fitment detail.

### Task 26 was NOT run — and its precondition is false

Task 26 says to confirm nothing reads `materialId` / `designId` / `colorId` /
`productTypeId` / `vehicle*` on `SalesOrder`, then drop them. That confirmation
fails: the order studio, dashboard, floor and label printing all read those
columns today. Dropping them would delete live configuration and break order
booking.

What is actually required first, as its own piece of work:

1. Rewrite the product-selection block of `src/app/owner/production/client.tsx`
   (`OrdersClient`, shared by `/owner/order-taking` and `/owner/production`) to
   pick a finished-good item — `getMasterData()` already returns `finishedGoods`
   and `SalesOrder.itemId` already exists.
2. Reroute every reader of the loose columns through `salesOrder.item`.
3. Backfill `SalesOrder.itemId` for existing orders.
4. Only then drop the columns and `ProductCombination`.

Treat steps 1-2 as a separate plan. They are a UI refactor of a large file, not
a schema change.

## Deferred — not in this plan

Named in the design spec, deliberately out of scope here. Each needs its own plan.

- **Item ↔ supplier mapping** — vendor item code, lead time, MOQ, last and average price. The wizard's Purchase section is a placeholder until this exists.
- **Batch, expiry and FEFO; serial numbers.** `ItemMaster.isBatchTracked` and the `batchNumber` string stay as they are. The client's Busy configuration shows batch tracking switched off, so this is not urgent.
- **Validity rules.** Explicitly rejected — cascading dropdowns make infeasible combinations mostly untypeable, and wrong data entered deliberately is the owner's mistake.
- **Regenerate-names action.** `nameTemplate` changes do not rewrite existing items. A previewable bulk regeneration is needed before the owner edits a template on a populated group.
- **Multi-level BOM UI.** The data model supports it after Task 22 (a BOM's parent and children are both items), but nothing yet renders a nested tree or explodes a multi-level BOM into material requirements.
