# Variant Multi-Select + SKU-Level BOM — Assessment & Plan

**Date:** 2026-07-28
**Status:** executed — all four phases shipped on `updates` (00dcae7, 3002953, 37c8bef, and the select sweep)

**Deviations from the plan as written, and why:**
- **2b uses a separate `ItemBomOverride` table**, not the single-table form. An override can *remove* an inherited line, and a `BomTemplateLine` row meaning "delete this" would sit next to rows meaning the opposite.
- **The wizard's BOM section edits the category recipe**, not a per-variant table. The recipe is entered once however many variants the pass creates; per-SKU tweaks come from the BOM expander on the item's row afterwards. A per-variant table in the wizard would need pending-override storage for items that do not exist yet — worth adding only if the owner asks for it.
- **Phase 4 was solved at the primitive**, not file by file. Rewriting `Select` to render its own listbox over a hidden native `<select>` fixed all 30 call sites at once; the nine files using raw `<select>` were then swapped to it.
**Source:** client conversation (via Antigravity) about multi-select variant generation and per-SKU BOM.

---

## 1. What the client actually asked for

Three things, in their own words:

1. **Multi-select variant generation.** Fixed axes (brand, model, generation, structural specs) are picked once. Variable axes (design, fabric, colour) are picked as *sets*. The wizard shows the resulting combinations, the owner unchecks the ones that don't apply, and each surviving combination becomes an SKU. A list of all variants is shown below.
2. **BOM per SKU, editable at any time.** "Owner was even ready to add BOM SKU-wise, because he won't be adding data all at once — it will be added as and when needed." Designs/fabrics/colours carry their own component lists which get pulled into the finished good, where quantities can be tweaked and extra RM/SF/consumables added.
3. **Every dropdown in Verity looks and behaves the same, and every one has "+ Add new"** which stores the typed text as a new entry.

---

## 2. Assessment — where Antigravity was right, and where it was wrong

I checked each claim against the actual code. Three of them don't hold.

### ❌ "Splitting a Finished Good into two layers: MASTER ITEM + VARIANTS"

**Not needed. Verity already has exactly one layer, and that's the correct one.**

An `ItemMaster` in Verity *is* a variant. Its identity is `specHash` — a hash of `(groupId + every answer)` — with `@@unique([factoryId, specHash])`. Two items that differ only in fabric are already two different items, with two different auto-composed names, two different codes, and their own stock, BOM, blueprint and orders.

Introducing a "parent item" above them would create a row that can never be produced, never be stocked and never be ordered, and would fork every query in the app into "is this a parent or a variant?". The "MASTER ITEM: Swift · DB · 4HDR · No Arm" in that diagram is not a record — it's **the set of answers the wizard is holding in memory while you fill the form**.

**Consequence: multi-select needs ZERO schema change.** It is a wizard UI feature. Pick sets on the variable fields, take the cartesian product, let the owner uncheck rows, then call the existing `createItemFromSpec` once per surviving row. Everything downstream already works.

### ❌ "The BomTemplateLine table already exists… each FG/SF item gets its own lines. No schema complexity."

**Wrong on the second half.** `BomTemplateLine` is keyed on **`groupId`**, not `itemId`:

```prisma
model BomTemplateLine {
  groupId   String      // ← the category, not the SKU
  itemId    String?     // fixed component
  sourceFieldId String? // component taken from a reference field's answer
  quantity  Float
  quantityFrom String?  // "design.fabricConsumption"
}
```

That is a **category-level recipe**, shared by every SKU in the group. It cannot express "this one Swift SKU needs an extra bracket." Per-SKU BOM genuinely requires a change.

### ✅ …but Verity already has the per-SKU layer, just not editable

This is the part worth knowing before we design anything:

```
BomTemplateLine  (per CATEGORY — the recipe)
        │  expandBomTemplate() at blueprint build time
        ▼
BOM → BOMItem    (per ITEM, via Blueprint → BlueprintVersion — the concrete list)
```

`ensureItemBlueprint(factoryId, itemId)` already materialises the category recipe into concrete `BOMItem` rows for one specific item. **The two-layer model Antigravity proposed as "Option 2" is already built.** What's missing is a screen to edit the concrete layer and a rule that says manual edits survive a rebuild.

### ✅ The modular-BOM behaviour the client described is also partly built

The client said designs and fabrics should carry their own components into the FG. Two mechanisms already exist:

- `sourceFieldId` — a BOM line whose **component** is whatever item was answered in a reference field. The "[FABRIC SLOT]" in Antigravity's diagram. Already implemented.
- `quantityFrom: "design.fabricConsumption"` — a BOM line whose **quantity** is read off the answered Design record. Already implemented.

So Antigravity's "key question that changes everything" — is consumption per-design or per-vehicle×design? — **Verity already answered: per-design**, via `Design.fabricConsumption`. That's the simple case (A). If Carxen later needs per-vehicle×design, it's an additive change (a new `quantityFrom` source), not a rebuild. **We do not need to block on this question.**

### ⚠️ "+Add new is a one-line change"

The one-line part is right — `canCreate` in `SpecCombobox.tsx:57` currently requires `matches.length === 0`, so you can't add "Suede Dark Blue" while "Suede Blue" is matching. Dropping that clause is correct and trivial.

But `onCreate` is passed at **exactly one call site in the whole codebase** (`SpecFieldInput.tsx:82`). "Every dropdown has + Add new" is not a one-line change — it's wiring a create action per context.

### ⚠️ "Replace every `<select>` with SpecCombobox"

There are 9 files with `<select>`. Several are **closed enums** — user role, order status, item type. Giving those a "+ Add new" lets an owner invent a role that RBAC has never heard of, or a status no state machine handles. Those should become a combobox for *visual* consistency but **without** `onCreate`. Blanket replacement would be a bug.

---

## 3. What I recommend building

Four phases, in dependency order. Phases 1 and 2 are the client's actual asks; 3 and 4 are the dropdown work.

### Phase 1 — Multi-select variant generation in the Add Master Data wizard

**No schema change.**

In `AddMasterDataClient.tsx`, each field in the Specification section gets a **single/multi toggle**. Default single (today's behaviour). Switching a field to multi lets you select several options — and only OPTION and REFERENCE fields can go multi (a free-text VALUE field has no set to choose from).

A new **Section 5 — Variants** appears as soon as any field is multi:

```
Design  ⊞multi  [✓ SPC PRO SERIES] [✓ ERGO FIT Vertex] [ Lifto 7L]
Fabric  ⊞multi  [✓ Leatherite Black] [✓ Leatherite Beige]
Colour  ⊡single [Beige]

4 combinations · 4 selected
┌──┬──────────────────────────────────────────────────┬────────────┬──────────┐
│✓ │ Seat Cover Maruti Swift 2005-2011 DB 4HDR …      │ FG-SC-0231 │          │
│✓ │ … SPC PRO SERIES · Leatherite Beige · Beige      │ FG-SC-0232 │          │
│✓ │ … ERGO FIT Vertex · Leatherite Black · Beige     │ FG-SC-0233 │ exists ⚠ │
│  │ … ERGO FIT Vertex · Leatherite Beige · Beige     │ —          │ excluded │
└──┴──────────────────────────────────────────────────┴────────────┴──────────┘
```

Details that matter:

- **Names are real, not mocked.** Each row's name/code comes from the existing `previewSpecName`, batched into one server call so a 40-row grid is one round trip.
- **Duplicates are shown before you save.** Each row's `specHash` is checked against existing items; matches are flagged `exists` and unchecked by default. Today you'd only find out on save, one failure at a time.
- **A combination cap.** 3 multi fields × 10 options each is 1,000 rows. Above 200 the grid refuses to expand and says which field to narrow. Silently generating 1,000 SKUs is a worse outcome than a refusal.
- **Save is transactional per row, reported in aggregate:** "38 created, 2 skipped (already exist)". One bad row does not lose the other 37.

### Phase 2 — Composable BOM: contributions, SKU overrides, and a wizard section

Three sub-parts. Together they give the client's "each thing carries what it's made of, and the finished good composes them" while keeping the freedom to just type a BOM per SKU.

#### 2a. Contributions — what each answer brings to the BOM

The client's instinct is right about the *mechanism* and slightly off about the *entities*:

| Thing | Carries components? | Why |
|---|---|---|
| **Design** ("ERGO FIT Vertex") | **yes** — a contribution | Not an item. A pattern. It's what knows 3.2 sqm of fabric + 50 m thread + 1.5 m piping. |
| **Fabric** ("Leatherite Black 220 GSM") | **no** | *Purchased.* It IS a component — it fills the fabric slot. Nothing inside the factory makes it. |
| **Colour** | **no** | Not an entity. It's which fabric you bought. Black and Beige are two RM items with two stock balances. |
| **Spec options** (DB, 4HDR, Armrest) | **optionally** | "With armrest" genuinely adds an armrest panel. Worth allowing. |

**But the freedom principle wins over that tidiness.** So the rule we implement is: **a contribution can be attached to any answer** — a design, a spec option, or a specific referenced item. If Carxen decides Suede always needs an extra backing sheet, they attach it to that fabric and it composes in. The merge engine takes contributions from every answered field and does not care what kind of thing they came from. Allowing it costs nothing; forbidding it means being blocked whenever my model of their factory is wrong.

This is the one genuinely new concept, and it is a small table:

```prisma
model BomContribution {
  factoryId String
  // Exactly one owner: an option, a referenced record, or an item.
  optionId  String?   // SpecFieldOption — "With Armrest"
  refId     String?   // Design / other reference record
  itemId    String?   // a specific RM, e.g. Suede
  // The component it brings, same shape as BomTemplateLine.
  componentItemId String?
  sourceFieldId   String?   // the [FABRIC SLOT] — filled by whatever was answered
  quantity Float
  quantityFrom String?
  wastePercent Float @default(0)
}
```

#### 2b. Per-SKU override

**Schema change:** `BomTemplateLine.groupId` becomes optional and an optional `itemId` owner column is added — one table serves both levels; a line belongs to *either* a group (recipe) or an item (override). Keeps `expandBomTemplate` unchanged.

Full resolution order when building an item's BOM — each layer beats the one above:

1. **Group recipe** — `BomTemplateLine` for the category (existing behaviour).
2. **Contributions** — merged in from every answered field (2a).
3. **SKU override** — the item's own lines. Same component ⇒ replaces the quantity; new component ⇒ adds; marked removed ⇒ drops.
4. `BOMItem` rows materialise from the result, as today.

Every line in the UI shows where it came from, so a surprising quantity is traceable in one glance rather than being archaeology.

#### 2c. BOM section in the Add Master Data wizard

A new skippable **Section 6 — Bill of Materials**, for **every inventory item**, not only finished goods — the client was explicit that all inventory master data gets a BOM section. Purchased items (RM / consumable / packaging) still get the section but it starts empty and says so; nothing forces a recipe onto something you buy.

With multi-select on, it shows the **shared recipe once** rather than making you fill it 40 times, with a per-variant override table underneath for the rows that differ:

```
Shared by all 4 variants
  Foam Sheet 5mm      2      pcs
  Poly Bag            1      pcs
  [+ Add line]

Per variant (only where it differs)
  … SPC PRO · Ltr Black   fabric slot → Leatherite Black   3.2 sqm   ← from design
  … SPC PRO · Ltr Beige   fabric slot → Leatherite Beige   3.2 sqm
```

An item with **no BOM is a normal, valid state.** Skipping is a first-class outcome, since data arrives as and when needed.

Also: a **BOM** expander on each Studio data-grid row, so a BOM can be added or edited long after the item was created — which is the actual working pattern the client described.

Plus a **Rebuild blueprint** action, since editing a BOM after production has been planned must not silently rewrite history — the same opt-in pattern already used by `regenerateGroupNames`.

**Deliberately not building:** a general formula engine (Antigravity's Option 1). `sourceFieldId` + `quantityFrom` + contributions cover every variable case Carxen actually has; an expression language is a large surface with no current demand.

### Phase 3 — "+ Add new" on every dropdown

`SpecCombobox`: drop `matches.length === 0` from `canCreate`, so `+ Add "…"` sits at the bottom of the list whenever something is typed — not only when nothing matches. Today you cannot add "Suede Dark Blue" while "Suede Blue" is matching.

"Stored as a new entry for that field" means two different things, and both get built:

- **OPTION field** → creates a new `SpecFieldOption` on that field. Typing "Cherry Red" in Colour adds Cherry Red to Colour permanently, for every future item.
- **REFERENCE field** → mints a **draft item** in the target category. Typing "Suede Grey 200 GSM" in Fabric creates the RM as a draft, so the form is never a dead end.

Neither should interrupt the form — creation happens inline and the new entry is selected immediately.

### Phase 4 — Native-feeling dropdowns everywhere

The client asked for **app-native dropdowns, not the browser's**. `SpecCombobox` already is that — custom-rendered, keyboard-driven, styled from our design tokens. The problem is the 9 files still using OS `<select>`, which renders as the grey Windows system list and looks nothing like the rest of Verity.

Replace them all, **with `onCreate` only where the list is genuinely open-ended** (fabrics, designs, suppliers, UOM). Closed enums — user role, order status, item type — get the same look and keyboard behaviour but **no** create option: a "+ Add new" there lets an owner invent a role RBAC has never heard of, or a status no state machine handles.

---

## 4. Scope summary

| Phase | Schema | Risk | Client value |
|---|---|---|---|
| 1 — Multi-select variants | none | low | **high** — the actual ask |
| 2a — Contributions | one new table | medium | **high** — the composing model |
| 2b — SKU override | one column change | medium | **high** — the freedom to just type it |
| 2c — BOM in wizard + Studio row | none | low | **high** — where it's actually used |
| 3 — "+Add new" everywhere | none | low | medium |
| 4 — Native dropdown sweep | none | low — but touches 9 files | medium |

Verification for each phase: unit tests on the new combination/merge logic, plus the existing 8-spec e2e suite and 86 unit tests kept green.

---

## 5. Open question for you (not blocking)

When an owner edits a SKU's BOM and *later* edits the category recipe, should the SKU keep its override or take the new recipe? My default is **keep the override** — it was a deliberate act — and surface it as "3 items override this recipe" on the category. Say if you'd rather the recipe always win.

---

## 6. What I need from you

Approve, or tell me which phases to cut or reorder. I'd suggest 1 → 2 → 3 → 4; phases 1 and 2 are what the client asked for and 3–4 are polish that can slip.
