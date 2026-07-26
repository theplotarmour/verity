# Custom Fields Everywhere — Implementation Plan

**Goal:** let a factory owner attach arbitrary, typed fields to *every major
entity* — orders, customers, items, products, departments, employees,
inspections, suppliers, purchase orders, dispatches — and have those fields
appear in the entity's editor, persist per-record, and surface on detail/list
views. "Ultimate freedom" = the client models their own vocabulary without a
code change.

---

## 1. Where we are today

Two inconsistent mechanisms already exist. They prove the demand and give us the
migration target:

| Mechanism | Definition model | Scope | Typed? | Values stored in |
|---|---|---|---|---|
| Product spec fields | `ProductField` | per `ProductType` | yes (`FieldType`) | `SalesOrder.dynamicData` (Json) |
| Custom item fields | `ItemFieldDefinition` | per factory | no (text only) | `ItemMaster.customFields` (Json) |

`FieldType` enum already exists: `TEXT, SELECT, NUMBER, MEASUREMENT, TOGGLE,
BUTTONS, CHECKBOX`.

**Problems with leaving them as-is:** two builders, two storage conventions, two
render paths; item fields are untyped; neither is reusable for a third entity.
Adding "custom fields to customers" today means a third parallel system.

## 2. Target architecture — one definition model, one value convention

### 2.1 Single definition model

```prisma
enum CustomFieldEntity {
  SALES_ORDER
  CUSTOMER
  ITEM
  PRODUCT
  PRODUCT_TYPE      // replaces ProductField over time
  DEPARTMENT
  EMPLOYEE
  INSPECTION
  SUPPLIER
  PURCHASE_ORDER
  DISPATCH
}

model CustomFieldDefinition {
  id         String            @id @default(cuid())
  factoryId  String
  entity     CustomFieldEntity            // which table this field decorates
  scopeId    String?                      // optional sub-scope, e.g. a ProductType id
  key        String                       // stable slug used as the JSON key
  name       String                       // human label
  type       FieldType         @default(TEXT)
  options    Json?                        // for SELECT/BUTTONS
  unit       String?                      // for MEASUREMENT (e.g. "mm")
  isRequired Boolean           @default(false)
  showInList Boolean           @default(false) // surface as a column/badge
  sortOrder  Int               @default(0)
  active     Boolean           @default(true)
  createdAt  DateTime          @default(now())
  updatedAt  DateTime          @updatedAt

  @@unique([factoryId, entity, scopeId, key])
  @@index([factoryId, entity])
}
```

- `key` is generated from `name` (slugified) and is immutable once created, so
  stored values never orphan when a label is renamed.
- `scopeId` keeps the ProductType-style narrowing (a field that only applies to
  "Seat Cover" orders) while defaulting to factory-wide (`scopeId = null`).

### 2.2 Value storage — a `customFields Json?` column per entity

Every decorated table gets one nullable `Json` column named `customFields`
(default `"{}"`), keyed by `CustomFieldDefinition.key`:

```json
{ "wood-type": "Teak", "delivery-window": "Morning", "urgent": true }
```

`ItemMaster.customFields` already exists in this exact shape — the convention is
proven. `SalesOrder.dynamicData` is the same idea under an older name; we keep
reading it as a fallback and write new order values into `customFields`.

Tables needing the new column: `Customer`, `Product`, `Department`,
`User`/`EmployeeProfile`, `Inspection`, `Supplier`, `PurchaseOrder`,
`Dispatch`, plus `SalesOrder` (add alongside `dynamicData`).

**Why JSON columns, not an EAV table:** values are always read with their parent
row, never queried across rows in bulk; JSON keeps reads single-round-trip and
avoids a join per field. If cross-record reporting on a custom field is needed
later, that specific field can be promoted to `showInList` and indexed with a
Postgres expression index on `(customFields->>'key')` — no schema churn.

## 3. Shared building blocks (write once, reuse everywhere)

### 3.1 Server: a generic definitions CRUD

`src/server/actions/customFields.ts`:

- `listFieldDefs(entity, scopeId?)` — active defs for an entity, ordered.
- `createFieldDef(input)` / `updateFieldDef(id, patch)` / `archiveFieldDef(id)`
  — owner/manager only; slugifies `key`; guards `@@unique`.
- `coerceAndValidate(defs, rawValues)` — server-side type coercion + required
  check, returning a clean `{ [key]: value }` object. **Every** entity's
  create/update action calls this before persisting `customFields`, so
  validation lives in one place, not per form.

### 3.2 Client: two reusable components

- `<CustomFieldsEditor entity scopeId values onChange />` — renders the right
  input per `FieldType` (text, number+unit, select, buttons, toggle, checkbox),
  enforces `isRequired`, emits a values object. Drop into any entity editor.
- `<CustomFieldsView values defs />` — read-only chips/rows for detail pages;
  respects `showInList` for compact contexts (table columns, cards).

Both consume the same `listFieldDefs` output, so a new entity is "add the column
+ mount two components + pipe values through `coerceAndValidate`."

### 3.3 Owner configuration surface

One settings page — **Settings → Custom Fields** — with an entity picker and the
existing field-builder UI (reuse `ProductType` field builder and the ItemsTree
header builder, which already do add/remove/reorder). Per-ProductType order
fields remain editable inline on the product-type screen but write to the same
`CustomFieldDefinition` table with `entity = PRODUCT_TYPE`/`SALES_ORDER`.

## 4. Rollout phases

**Phase 1 — foundation (no user-visible change).**
Add `CustomFieldDefinition` + `CustomFieldEntity`; add `customFields` columns to
target tables; build `customFields.ts` actions + `coerceAndValidate`; build the
two client components. `prisma db push` (all additive/nullable — safe on live
data).

**Phase 2 — migrate the two existing systems.**
Backfill `ItemFieldDefinition` → `CustomFieldDefinition(entity=ITEM)` and
`ProductField` → `(entity=SALES_ORDER, scopeId=productTypeId)`; keep the old
tables readable during transition. Point ItemsTree and the production studio at
the shared components. Read order values from `customFields` first, falling back
to `dynamicData`. Once verified, the old models can be dropped in a later pass.

**Phase 3 — expand to new entities, one per PR.**
Customers → Suppliers → Employees → Departments → Purchase Orders → Inspections
→ Dispatches. Each is: add column (done in P1), mount editor in the entity's
form, mount view on its detail page, add `showInList` columns where useful.

**Phase 4 — polish.**
`showInList` columns on list views; include custom fields in exports/print
(passport, PO, dispatch note); optional per-field visibility by role.

## 5. Guardrails

- **Authorization:** defining fields is owner/manager only; every entity's
  existing per-record access rules (e.g. `canAccessJobCard`) still gate who can
  read/write the values — custom fields inherit the parent row's permissions.
- **Key immutability:** rename changes `name`, never `key`.
- **Archival over deletion:** `active = false` hides a field but keeps historical
  values intact and readable.
- **Type changes:** disallow changing `type` once values exist (offer "archive +
  create new" instead) to avoid coercion ambiguity.
- **Tenant isolation:** every query filters `factoryId`; `@@unique` includes it.

## 6. Effort estimate

| Phase | Scope | Rough size |
|---|---|---|
| 1 | schema + shared server/client plumbing | ~1 focused day |
| 2 | migrate items + product fields onto the shared system | ~half day |
| 3 | 7 entities × (mount editor + view) | ~0.5–1 day total |
| 4 | list columns, exports, role visibility | ~half day |

The heavy lifting is Phase 1; every entity after the first is small because the
column, the validator, and the two components are already built.
