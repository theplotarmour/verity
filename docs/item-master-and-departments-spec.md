# Item Master & Departments — Implementation Spec

Status: **Draft for review** · Target branch: `updates` · Author: engineering
Scope: Item Master overhaul, Category/Subcategory/UOM masters, and a from-scratch
Departments module that replaces Production/Stitching Teams.

---

## 1. Goals

1. **One Item Master** used everywhere — Purchase, Inventory, BOM, Production, QC,
   Dispatch. No module keeps its own item list.
2. A **rich Item Master** matching the client's field list (code, type, category,
   subcategory, UOM + secondary/conversion, brand, image, alias, keywords, status).
3. **Configurable Category / Subcategory / Unit masters** the owner can extend.
4. **Auto-only inventory** — stock changes solely through transactions
   (Purchase, Material Issue, Production Completion, Dispatch, Return, Adjustment).
   No manual +/- of a stock number anywhere in the UI.
5. **BOM behaves like a recipe** — every line comes from the Item Master, and
   production auto-computes required qty from the order and reduces inventory.
6. **Departments from scratch** — a multi-stage production chain
   (CAD → Cutting → Stitching → QC → Packing) where **every** department has a
   customizable template exactly like QC, an owner-managed roster of workers and
   inspectors, and configurable ordering. **Production Teams and Stitching Teams
   are removed entirely.**

Non-goals (this spec): CRM changes, customer portal, analytics dashboards.

---

## 2. Current State (what exists today)

| Concern | Model / file | Status |
|---|---|---|
| Item Master | `ItemMaster` (`schema.prisma`) | Exists, thin. `items.ts` only creates `RAW_MATERIAL`. |
| Item types | `enum ItemType` | 7 values; missing `SPARE_PART`, `MACHINERY`, `TOOL`. |
| Category | `MaterialCategory` | Flat, no subcategory, no CRUD UI. |
| UOM | `defaultUOM` + `UOMConversion` | Model exists, no UI for secondary/conversion. |
| Inventory ledger | `StockLedgerEntry`, `BinBalance` | ✅ single mutation path; balances derived. |
| BOM | `BOM`, `BOMItem`, `MaterialReservation` | ✅ present; consumption wiring to verify. |
| Stage chain | `WorkflowStage` (seeded in `lib/server/stages.ts`) | ✅ CAD→Cutting→Stitching→QC→Packing. One `JobCard` per stage. |
| Templates | `QCTemplate`/`TemplateSection`/`Checkpoint` | ✅ generic; only QC stages consume it today. |
| Rework loop | `stages.ts` `completeStage`, inspector flow | ✅ QC reject returns to previous incomplete card. |
| Teams | `ProductionTeam`, `JobCard.teamId`, `User.team/ledTeams`, `owner/teams/*` | **To be deleted.** |
| Nav | `components/layout/owner-shell.tsx:69` "Production Teams" → `/owner/teams` | Replace with "Departments" → `/owner/departments`. |

---

## 3. Data Model Changes

### 3.1 `ItemType` enum — add three values

```
enum ItemType {
  RAW_MATERIAL
  SEMI_FINISHED
  FINISHED_PRODUCT
  CONSUMABLE
  PACKAGING
  SPARE_PART   // new
  MACHINERY    // new
  TOOL         // new
  ASSET        // keep (legacy)
  SERVICE      // keep (legacy)
}
```
Client's "Finished Goods" = `FINISHED_PRODUCT`, "Semi-Finished Goods" =
`SEMI_FINISHED`. UI label map handles the display names.

### 3.2 `ItemMaster` — new columns

```
model ItemMaster {
  // ...existing...
  itemCode       String   // auto-generated, editable, unique per factory
  brand          String?
  description    String?
  imageUrl       String?
  aliasName      String?
  searchKeywords String[]  @default([])
  status         String    @default("ACTIVE") // ACTIVE | INACTIVE
  subcategoryId  String?
  subcategory    MaterialSubcategory? @relation(fields: [subcategoryId], references: [id], onDelete: SetNull)
  secondaryUOM   String?
  @@unique([factoryId, itemCode])
}
```
- `itemCode` auto-gen format: `<TYPE-PREFIX>-<5-digit sequence>`
  (e.g. `RM-00042`, `FG-00007`), editable at create time, validated unique.
- `sku` stays (external/label code); `itemCode` is the human master code.
- `status = INACTIVE` hides the item from new selections (Purchase/BOM/Order
  pickers) but keeps historical references intact.

### 3.3 Category / Subcategory masters

`MaterialCategory` stays. Add:

```
model MaterialSubcategory {
  id         String  @id @default(cuid())
  factoryId  String
  categoryId String
  category   MaterialCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  name       String
  items      ItemMaster[]
  @@unique([factoryId, categoryId, name])
  @@index([factoryId])
}
```
`MaterialCategory` gets `subcategories MaterialSubcategory[]`.

**Seed defaults** (idempotent, per factory):
- Categories: Raw Material, Finished Goods, Semi Finished, Packaging,
  Consumables, Machinery, Spare Parts.
- Raw Material subcategories: PU Leather, PVC Leather, Fabric, Foam, Thread,
  Elastic, Velcro, Zipper, Piping, Labels, Plastic Parts, Metal Parts,
  Rubber Parts.
- All are owner-editable/extendable; seeds are just a starting set.

### 3.4 UOM master

Primary/secondary/conversion are already representable via `defaultUOM`,
`secondaryUOM`, and `UOMConversion`. No new model required. A **Unit master**
(optional) can be added later as a `Json` list on `Factory.settings.units`; for
v1 the UOM fields are free-text with a shared suggestion list to avoid over-
modelling.

### 3.5 Departments (from scratch) — remove Teams

**Delete:**
- model `ProductionTeam`
- `JobCard.teamId` + `JobCard.team`
- `Department.teams`
- `User.teamId` + `User.team` + `User.ledTeams`
- `Factory.productionTeams`
- routes `src/app/owner/teams/*`, `src/app/owner/team/*` **only if** `team` is
  the teams feature (verify: `/owner/team` is the *people* page — **keep it**;
  `/owner/teams` is Production Teams — **remove it**).
- `src/server/actions/teams.ts`

**Promote `Department` to the stage-owning entity.** A department **is** a stage
in the production chain.

```
model Department {
  id           String  @id @default(cuid())
  factoryId    String
  name         String
  description  String?
  sortOrder    Int     @default(0)     // NEW — chain position
  isQcStage    Boolean @default(false) // NEW — runs inspection flow
  requirePhoto Boolean @default(false) // NEW
  requireRemarks Boolean @default(false) // NEW
  templateId   String? // NEW — the department's checklist template
  template     QCTemplate? @relation(fields: [templateId], references: [id], onDelete: SetNull)
  active       Boolean @default(true)
  capacity     Float?
  createdAt    DateTime @default(now())

  members    User[]   @relation("DepartmentMembers") // NEW roster
  jobCards   JobCard[]
  routeSteps BlueprintRouteStep[]
  @@unique([factoryId, name])
  @@index([factoryId])
}
```

**`User` gets a single department membership** (per decision: no teams,
one department per person; role distinguishes worker vs inspector):

```
model User {
  // ...
  departmentId String?
  department   Department? @relation("DepartmentMembers", fields: [departmentId], references: [id], onDelete: SetNull)
}
```

**`WorkflowStage` → collapse into `Department`.** Today `WorkflowStage` and
`Department` are parallel. We converge on `Department` as the single source of
the chain. Two migration options:

- **Option A (chosen):** Keep `JobCard.stageId` but repoint stage-like flags onto
  `Department`. Migrate each `WorkflowStage` into a `Department` row (matching by
  name), copy `sortOrder`/`isQcStage`/`requirePhoto`/`requireRemarks`/
  `qcTemplateId→templateId`, then have `JobCard` reference `departmentId` as the
  authoritative stage and drop the separate `WorkflowStage` table in a later
  cleanup migration. `JobCard.stageId` kept nullable during transition.

`JobCard` after migration:
```
model JobCard {
  // ...
  departmentId String        // authoritative stage = department
  department   Department @relation(...)
  // teamId + team REMOVED
  // stageId kept temporarily, dropped in cleanup migration
}
```

`QCTemplate` gains `departments Department[]` back-relation.

### 3.6 Template generalization

No structural change to `QCTemplate`/`TemplateSection`/`Checkpoint` — it is
already a generic sections-and-checkpoints tree. We change *semantics*:

- A template attached to a **non-QC department** = a **stage checklist**: the
  worker ticks checkpoints (with photo/remarks per checkpoint rules) to complete
  the stage. No pass/fail verdict.
- A template attached to a **QC department** (`isQcStage = true`) = the existing
  inspection flow with pass/fail + inspector verification.

The Settings → Templates builder (`QCTemplateBuilder.tsx`) is reused verbatim;
only the attach-point UI ("assign this template to a department") is new.

---

## 4. Server Actions

### 4.1 `items.ts` — replace `createMaterial` with full CRUD
- `createItem(input)` — all fields; auto-gen `itemCode` (editable), validate
  unique per factory, default `status=ACTIVE`.
- `updateItem(id, input)`
- `setItemStatus(id, status)` — Active/Inactive toggle.
- `listItems({ search, type, categoryId, status })` — server-side filter; `search`
  spans name/itemCode/sku/alias/searchKeywords.
- Guard: owner/manager only; `revalidatePath("/owner/inventory")`.

### 4.2 `masterData.ts` — categories/subcategories/units
- `createCategory`, `renameCategory`, `deleteCategory` (block delete if items
  reference it).
- `createSubcategory(categoryId, name)`, `renameSubcategory`, `deleteSubcategory`.
- `seedMasterDefaults()` — idempotent seed of §3.3 defaults.

### 4.3 `departments.ts` — rewrite (from scratch)
- `listDepartments()` — ordered by `sortOrder`, with member counts + template name.
- `createDepartment({ name, description, isQcStage, requirePhoto, requireRemarks, templateId })`.
- `updateDepartment(id, patch)`.
- `reorderDepartments(orderedIds[])` — sets `sortOrder`; **the chain sequence.**
- `deleteDepartment(id)` — block if it has active job cards; else soft-`active=false`.
- `assignTemplate(departmentId, templateId)`.
- `addMember(departmentId, userId)` / `removeMember(userId)` — sets
  `User.departmentId`. Workers and inspectors both, distinguished by `User.role`.

### 4.4 `orders.ts` — build the chain from departments
Replace the `department = findFirst(...)` hack (`orders.ts:379`) and
`ensureFactoryStages`:
- Read active departments ordered by `sortOrder`; create one `JobCard` per
  department (`departmentId` = that department, `sequence = sortOrder`).
- QC inspection is attached to the department where `isQcStage = true`.
- Remove all `teamId` writes.

### 4.5 `stages.ts` — completion validates against department template
- `completeStage` for a non-QC department with a template: require each required
  checkpoint answered + photos/remarks per checkpoint before allowing complete
  (mirrors current `requirePhoto/requireRemarks` but template-driven).
- Rework loop unchanged.

### 4.6 Inventory guard
- Audit that **no** action exposes a raw "set stock = N". `StockLedgerEntry`
  transaction types remain: `RECEIPT`, `ISSUE`, `TRANSFER`, `ADJUSTMENT`
  (adjustment requires a reason + remark, already modelled).
- Production completion auto-consumes reserved BOM materials as `ISSUE`; finished
  goods land as `RECEIPT` (already in `stages.ts` via `receiveFinishedGoods`).

---

## 5. UI

### 5.1 Inventory → **Items** tab (new)
Location: new tab inside `src/app/owner/inventory/InventoryClient.tsx`.
- Searchable, filterable table (type, category, status).
- Row → edit drawer. "New Item" → create drawer.
- Fields: Item Code (auto, editable) · Name · Type · Category · Subcategory ·
  Primary UOM · Secondary UOM · Conversion Factor · Status · Brand ·
  Description · Image (via `storage.ts`) · Alias · Search Keywords (chips).
- Inactive items shown greyed with a filter toggle.

### 5.2 Settings → Master Data
Add Category/Subcategory manager (nested list, add/rename/delete) and a UOM
suggestion-list editor to the existing `owner/settings/master-data` page.

### 5.3 **Departments** page (new) — replaces Production Teams in nav
Location: `src/app/owner/departments/` · nav entry replaces
`owner-shell.tsx:69` ("Production Teams" → **"Departments"**, `/owner/departments`,
icon `UsersRound` or `Factory`).
- **Chain view:** ordered list of departments (drag to reorder = production
  sequence). Each card shows: name, stage flags (QC?, photo?, remarks?),
  attached template, member count.
- **Add/Configure department:** name, description, toggles, template picker
  (links into the Templates builder), "QC stage" toggle.
- **Roster:** per department, add/remove workers and inspectors (from factory
  users); shows role badges.
- **Templates:** "Configure template" opens the same builder QC uses.

### 5.4 Worker stage screen
`worker/stage/[id]` renders the department's template checklist when present
(same component family as inspector checkpoints), else falls back to the current
photo/remarks capture.

### 5.5 Removals
- Delete `owner/teams` route + nav item + `TeamsClient.tsx` + `teams.ts`.
- Remove team references from production/floor UI.

---

## 6. Migration Plan (ordered, each its own commit → `updates`)

1. **Schema + migration**: `ItemType` values, `ItemMaster` fields,
   `MaterialSubcategory`, `Department` stage fields + `User.departmentId`,
   **drop** `ProductionTeam`/`teamId`/team relations. Data migration:
   `WorkflowStage` rows → `Department` rows (matched by name); existing
   `JobCard.teamId` dropped (teams removed per decision).
2. Item Master CRUD action + Items tab.
3. Category/Subcategory/UOM masters + seed defaults.
4. Departments page (CRUD, reorder, roster) + nav swap.
5. Per-department templates: attach UI + worker stage renders template.
6. `orders.ts`/`stages.ts` rewire to departments; remove team writes.
7. Cleanup migration: drop `WorkflowStage`/`JobCard.stageId` once nothing reads
   them. Verify auto-inventory + BOM auto-consume end-to-end.

### Migration safety notes
- `ProductionTeam` removal is destructive. Since teams are being dropped by
  product decision, the migration deletes them without data preservation, but the
  **stitching work itself is unaffected** — job cards move to the Stitching
  *department*; only the crew-grouping layer disappears. Assignment falls back to
  `JobCard.assignedToId` + department roster.
- Run on Supabase via `prisma migrate` (dev) / `db push` per existing workflow;
  do not hand-edit `.env`.

---

## 7. Acceptance Criteria

- [ ] Creating a Purchase Order, BOM line, and Sales Order all pick from the
      **same** Item Master list; inactive items excluded from new selections.
- [ ] Item Master supports every field in §3.2 with auto/editable item code.
- [ ] Categories and subcategories are owner-editable; defaults seeded once.
- [ ] Owner can create a department, set it as a QC or normal stage, reorder the
      chain, attach a template, and add workers + inspectors.
- [ ] A new production order generates one job card per active department in
      `sortOrder`; QC card runs inspection; rework returns to prior department.
- [ ] Every non-QC department can require a template checklist to complete a
      stage, built in the same Templates builder as QC.
- [ ] No UI path sets a stock quantity directly; all stock moves are ledger
      transactions.
- [ ] Production completion auto-consumes BOM materials and receipts finished
      goods.
- [ ] "Production Teams" is gone from nav, replaced by "Departments"; no team
      routes/actions remain.
