# Item Master & Spec Engine — Design

**Date:** 2026-07-27
**Status:** Approved design, pending implementation plan
**Scope:** Verity only

## Product Rule

**The Master Data Studio is not where factory owners primarily enter records.**
It is where they define schemas, relationships, naming rules, and templates.
Actual records are created through one universal **Add Master Data** wizard that
dynamically renders its form from the selected blueprint. The studio may show
data for review, search, import, export, and correction, but the owner's normal
creation path is always the wizard.

## Problem

Verity's depth is post-release: job cards, stage entries, QC, dispatch. The
master-data layer upstream of "release to floor" is thin, and that layer is where
a factory owner spends his day. The pilot client (Carxen, 8 years on Busy 21)
reads the product as mostly built for his workers and barely built for him.

The specific complaint is item master, BOM, and inventory configurability. He
wants the freedom Busy gives him: define his own fields, his own groups, his own
codes — without a developer.

Today Verity has:

- A flat `ItemMaster` with a fixed field set and a name-only `ItemFieldDefinition`
- A 2-level category tree (`MaterialCategory` → `MaterialSubcategory`)
- A flat `BOM`, one per `BlueprintVersion`, whose children are items but whose
  parent is not — so the graph terminates after one level and semi-finished goods
  have nowhere to live
- 12 hardcoded tabs in `MasterSheetView.tsx` (1,853 lines) backed by ~40 bespoke
  server actions in `masterData.ts` (1,334 lines), one pair per entity
- Finished goods living in a separate `Product`/`ProductVariant` line, disconnected
  from items, with `ProductVariant.itemId` present but unused

## Approach

A **spec-driven item master**. The owner does not enter items; he defines what an
item of a given kind *is*, informationally, and items are instantiated from that
definition. Name, code, identity, and BOM all derive from the spec rather than
being typed.

This is the thing neither Busy nor Odoo Community can do — Busy has fixed fields
plus a handful of user-defined ones; Odoo needs Enterprise Studio and still cannot
compose names from field values.

## Core model

### `ItemGroup`

Self-referencing tree, n levels. Roots are the six item types:

```
Finished Good        Raw Material           Packaging
  └ Seat Cover         └ Fabric               Consumable
  └ Mats                   └ Leatherite       Trading Goods
  └ Steering Cover         └ Suede            Semi-Finished
                       └ Foam
                       └ Thread
```

Each node carries its spec fields, its name/code templates, and its BOM template.

Replaces `MaterialCategory` + `MaterialSubcategory`, which migrate in as a 2-level
tree.

### `SpecField`

A field definition attached to a group and **inherited down the tree**. `Fabric`
defines GSM/thickness/width; `Leatherite` inherits them and adds Grain/Backing.
Defining common attributes once and specializing at the leaf is what makes this
scale past a few groups.

Three kinds:

| Kind | Meaning | Example |
|---|---|---|
| **Value** | text, number, measurement, toggle | GSM = 220, Thickness = 1.2mm |
| **Option** | fixed list defined on the field | Back Type: Single Back / Double Back |
| **Reference** | points at another group; options are that group's items | Fabric → `Raw Material › Fabric` |

Generalizes the existing `ProductType`/`ProductField`/`FieldType` engine from
products to groups. That engine is reused, not rewritten.

### Reference fields

The mechanic that turns a flat item list into a connected graph.

A reference field targets an **`ItemGroup` node**, with `includeDescendants`
defaulting to **true**. Pointing `Fabric` at `Raw Material › Fabric` surfaces every
item in Leatherite, Suede, and any subgroup added later. With the flag off, a new
subgroup silently stops appearing in dropdowns with no error — so on is the only
safe default.

A reference field may declare `dependsOnFieldId`, which filters its options by the
answer to another field. Brand → Model → Generation cascade this way, and a
dependent field stays disabled until its parent is answered.

Reference fields also carry the BOM link (below).

### `SpecFieldOption`

Options carry `value`, `label`, and `shortCode`. The short code feeds the item
code — "Double Back" → `DB`. Numeric fields may carry a display suffix — `4` → `4HDR`.

### `ItemFieldValue`

The answers: `(itemId, fieldId, valueText | valueNumber | valueRefId)`. Normalized
rows, not a JSON blob — references need real foreign keys, and "every item using
Leatherite Beige" must be a join rather than a JSON scan.

`ItemMaster.customFields` and `ItemFieldDefinition` are superseded.

## Naming, codes, and identity

Each `ItemGroup` carries two templates:

```
nameTemplate  {group} {brand} {model} {generation} {backType} {headrests} {armrest} {design} {color}
              → Seat Cover Maruti Swift 2005-2011 DB 4HDR No Arm Lifto SPC PRO SERIES 7 Lines Beige

codeTemplate  same tokens, short codes
              → SC-MRT-SWFT-0511-DB4-NA-LIFTO-BEI
```

**Reference tokens render `alias ?? name`.** Every item has an alias — the fabric
"Leatherite Beige 220 GSM" carries alias "Beige", and the seat cover's name uses
"Beige". The same alias makes the item findable by search. One field, two jobs, no
token-path syntax. Accepted limitation: one alias per item, so every parent sheet
gets the same short form.

**Names compose recursively.** A referenced item's own name is generated from its
own spec fields, so configuring upstream sheets well improves every downstream
sheet for free.

**Identity is the tuple of answers.** Hash `(groupId, all field values)` and make it
unique. Creating the same seat cover twice under two names becomes structurally
impossible — a real daily problem in Busy after 8 years. There is no interstitial
warning UI; autofill means the owner sees a match before he creates one. The
constraint exists to protect CSV import and order-studio drafts, where no human is
looking.

**Materialize, don't recompute.** `name` and `itemCode` are stored columns on
`ItemMaster`. Changing a group's `nameTemplate` must not silently rename 10,000
items — "regenerate names" is an explicit, previewable action.

## BOM

`ItemMaster` gains `manufacturingType`: **Make / Buy / Both**. This — not item type
— decides whether an item has a BOM.

Two views on every item:

- **BOM** — the recipe to make *this* item. Make/Both only.
- **Used In** — what this item goes into. Everything, including consumables. Tape,
  chalk, and needles have no recipe but appear as lines in seat cover BOMs.

An `ItemGroup` carries a **BOM template** whose lines are:

- **fixed** — every seat cover uses 1 × Thread Cone, 4 × Elastic Strap
- **from a reference field** — the Fabric line's item is whatever was answered in
  the `{fabric}` field
- **from a formula** — quantity = `design.fabricConsumption × 1`, which already
  exists on `Design`

So filling the spec produces the bill of materials. The 95% case needs no separate
BOM entry step; per-item override handles the rest.

**Multi-level BOM** falls out of the item merge: once finished goods are items, a
BOM's parent and children are both items, and `cut panel → embroidered panel →
stitched back → kit` is expressible. Today `BOM` hangs off `BlueprintVersion`, so
the graph is one level deep.

## Sheets

### Three kinds

| Kind | Rows are | Stock/BOM | Configurable |
|---|---|---|---|
| **Item** | `ItemMaster` | yes | yes |
| **Attribute** | values referenced by spec fields | no | yes |
| **System** | fixed entities with business logic | n/a | no |

Not everything dissolves into the meta-model. Vehicles stay a concrete 5-level
reference tree with its own UI — it is referenced by `ProductVehicleFitment` and a
tree is not a spreadsheet.

### Two modes

| Mode | Edits | Frequency |
|---|---|---|
| **Configure** | the *columns* — spec fields, options, short codes, templates, BOM template | rarely, per group |
| **Data** | the *rows* — searchable, sortable, filterable, CSV in/out | daily |

The CSV header is generated from the configuration, which is why import/export is
built once rather than per sheet.

### Disposition

| Tab today | Kind | Outcome |
|---|---|---|
| Vehicles | Attribute | Keep as-is, bespoke tree UI |
| Designs | Attribute | Keep; hardcoded columns become spec fields |
| Colors | Attribute | Keep; gains config mode |
| Fabrics | Item | **Merges into Items** as `Raw Material › Fabric` |
| Items | Item | **Splits into one tab per root group**, subgroup tree in sidebar |
| Products | Item | **Merges into `Finished Good`** |
| Variants | — | **Deleted.** A variant is an item |
| Spec Presets | — | **Deleted as a tab.** Becomes Config mode on every sheet |
| Suppliers | System | Keep; later gains item↔supplier mapping |
| Customers | System | Keep, untouched |
| Locations | System | Keep — warehouse/zone/rack/shelf/bin |
| Templates | System | Keep — QC templates have their own builder |

Net: 12 hardcoded tabs → ~6 owner-defined item tabs + 3 attribute + 4 system. The
~40 bespoke server actions collapse to one generic create/update/delete driven by
spec fields, and `MasterSheetView.tsx` loses most of its 1,853 lines to a single
field-driven renderer.

## Add Master Data

The only interactive creation path. **Full-width horizontal layout** — fields in a
grid, name preview as a bar across the top. Building a row, not filling a form.

1. **Type** — six cards: Raw Material / Semi-Finished / Finished Good / Consumable /
   Packaging / Trading Goods
2. **Group** — drill the subgroup tree to a group with a spec sheet
3. **Spec** — fields render in configured order; the name and code assemble live at
   the top as they are answered. Reference fields are comboboxes: type-ahead over
   name *and* alias, arrow-key navigation, Enter to select, Tab to advance. One
   shared component, keyboard-complete. Dependent fields stay disabled until their
   parent is answered
4. **Inline reference creation** — if the fabric isn't listed, the combobox offers
   `＋ Add "Leatherite Beige 220"`, opens a nested mini-form from *that* group's spec
   sheet, creates it, selects it, and returns. Without this every new item sends the
   owner to another tab and he loses the thread; this behavior is the difference
   between the studio being used and abandoned
5. **Sections below the spec**, shown only where relevant:
   - **Stock** — UOM, alt UOM + factor, batch tracking, reorder/min/safety, valuation
   - **BOM** — generated from the group's template, filled in, editable (Make/Both only)
   - **Purchase** — preferred suppliers, vendor code, lead time, MOQ
   - **Documents** — images, CAD, spec sheets, certificates
   - **Pricing** — MRP, dealer, distributor
6. **Save** — item created, name/code materialized, field values written, BOM
   instantiated

**Three creation paths, one function:** the wizard, CSV import, and order-studio
drafts all resolve to the same create call, so naming and validation cannot drift
between them. Sheets do **not** get inline Add Row — partial rows would produce
partial items.

## Catalog + on-demand drafts

The owner pre-enters the approved catalog: the fast path, dropdown-complete, priced.

When a customer wants something not in it, the order studio **mints a new item on
the fly** from the same spec sheet, flagged `DRAFT`. It is real, usable, and
produceable immediately. Draft items surface in the Master Data Studio for the
owner to review, price, and promote.

The catalog grows from demand rather than from data-entry stamina, and master data
never blocks an order.

## CSV import / export

Per sheet, with columns known from configuration:

- **Export** — current rows; references resolved to names, not ids
- **Download template** — header row, one filled sample row, and a second sheet
  listing every valid option for each dropdown column. Generated, never maintained
- **Import** — dry run first. References resolved by name → alias → search keyword.
  Per-row error report. Nothing commits until the preview is accepted; no silent
  partial commits

The QC template CSV import/export added in `0575e16` is lifted into a shared module
rather than duplicated.

## Non-goals

**No validity rule engine.** Cascading dropdowns make infeasible combinations
mostly untypeable by construction. Beyond that, wrong data entered by the owner is
the owner's mistake.

**No pre-generated combinations.** `ProductCombination` is deleted. Brand × model ×
generation × back × headrest × armrest × design × fabric × color is millions of
rows; items are created on demand instead.

**No migration of live orders.** Existing `SalesOrder` data is mock. The old
`materialId`/`designId`/`colorId`/`vehicle*` path is wiped and re-seeded rather
than backfilled.

**No inner platform.** The boundary is explicit:

- **Hard columns on `ItemMaster`** for what *the system* reasons about: type, group,
  UOM, valuation, batch flag, stock policy, status, HSN, manufacturing type.
  Inventory, procurement, and production logic depend on these. They never become
  configurable fields.
- **Spec fields** for what only *humans* reason about: GSM, foam density, headrest
  count, design name, grain.

Configurability serves the owner's vocabulary. It must not swallow the system's own.

**Out of scope entirely** (per Verity's Factory-OS scope): CRM fields, compliance
registers (RoHS/REACH/MSDS), export pricing, return policy. Verity serves
manufacturers.

## Implementation phases

1. **Engine** — `ItemGroup` tree, `SpecField`, `SpecFieldOption`, `ItemFieldValue`.
   Migrate `MaterialCategory`/`MaterialSubcategory` in; generalize
   `ProductType`/`ProductField` rather than writing new
2. **Naming** — name/code template engine, alias resolution, tuple hash. Pure
   functions, heavily unit-tested, no UI
3. **Generic sheet renderer** — one field-driven component replacing 12 bespoke
   column sets, with Configure/Data modes
4. **Add Master Data wizard** — wide layout, live name preview, inline reference
   creation
5. **CSV import / export / template** — shared module, all sheets
6. **BOM templates and generation** — plus `manufacturingType`, BOM/Used-In views
7. **Finished goods into `ItemMaster`** — backfill `ProductVariant.itemId`, retire
   the Variants tab, move blueprints onto items
8. **Order-studio drafts** — on-demand item minting, `DRAFT` status, promotion flow

Phases 1–3 are the foundation; everything after is cheap by comparison. Phase 7
touches order taking and production scheduling and is deliberately late.

## Effects on other modules

**Order taking** simplifies. `ProductType`/`ProductField` currently does two jobs —
item spec and order-level dynamic fields. Once finished goods are items, the studio
picks an *item* and the spec comes with it; brand/model/design are not re-asked per
order. `SalesOrder.dynamicData` shrinks to genuinely order-specific data (remarks,
special requests).

**Production scheduling** reads the blueprint off the item rather than off
`ProductVariant`. Same data, one less hop.

**Inventory** is largely unaffected — the warehouse tree, stock ledger, bin
balances, and QC-hold buckets already exceed what the client uses. Finished goods
gain stock for free by becoming items.

## Open items

- Item↔supplier mapping (vendor item code, lead time, MOQ, last/average price) is
  named in the wizard's Purchase section but not yet modelled. Belongs with phase 6.
- Batch/expiry/FEFO and serial numbers remain as today (`isBatchTracked` flag plus
  a `batchNumber` string). A real `Batch` entity is deferred; the client's Busy
  config suggests he does not use batch tracking.
- The real Busy master export is still outstanding. The file provided
  (`20260726_MSAll.DAT`) is a blank company — 0 items. It will validate this design
  rather than change it.
