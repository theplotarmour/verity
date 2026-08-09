# Carxen Master Data Engine Completion Plan

**Date:** 2026-07-28
**Status:** Implementation plan
**Scope:** Verity, `D:\Code\verity`

## Verdict

The current spec engine is a strong inventory item foundation, but it is not yet
the Carxen Master Data command center. The product is split between:

- legacy spreadsheet sheets at `/owner/settings/master-data`
- spec-driven inventory studio at `/owner/settings/master-data/studio`
- inventory-only add wizard at `/owner/settings/master-data/add`

That fragmentation breaks the intended workflow:

```text
Master Data Studio -> Configure Blueprint -> + Add Master Data -> Dynamic Wizard -> Record Created
```

The fix is not to delete the existing concrete models. Vehicles, designs,
suppliers, warehouses, customers, and employees already have operational tables
and downstream consumers. The fix is to add a unifying **Master Data Domain**
layer that lets the studio and universal add wizard orchestrate both:

- inventory blueprints backed by `ItemGroup` / `SpecField` / `ItemMaster`
- reference/system masters backed by their existing operational models

## Non-Negotiable Product Rule

Master Data Studio is the configuration and workbook command center. It is not a
collection of hidden settings pages, and it is not primarily a record-entry form.
All single-record creation should enter through one prominent universal
`+ Add Master Data` wizard.

Data Mode may support search, audit, import/export, and controlled correction.
Configure Mode defines the blueprint: fields, references, naming/code rules,
capabilities, BOM, QC, routing, CAD, and downstream defaults.

## Current Gaps

| Area | Current state | Required state |
|---|---|---|
| Navigation | Studio lives under settings routes | First-class `/owner/master-data` workspace |
| Creation | Add wizard only shows six inventory roots | Wizard supports Inventory, Vehicle, Design, Color, Supplier, Customer, Machine, Warehouse, Employee |
| Blueprint model | `ItemGroup` only describes inventory groups | Domain layer describes all master-data domains and maps them to backing models |
| Capabilities | `manufacturingType` exists on items; group capability flags missing | Blueprint capability flags drive BOM, QC, routing, CAD, purchase, sales |
| References | `SpecRefTarget` has vehicle/design/color only | Reference targets include supplier, customer, warehouse/bin, employee, machine, department, item group |
| UX | Split legacy/new routes and neutral styling | Single Verity workbook shell with Configure/Data modes and universal add overlay |
| Downstream defaults | BOM templates exist; QC/routing defaults are not attached at group level | Creating a record can attach default BOM/QC/routing/CAD metadata where capability flags allow |

## Architecture

### 1. Add Master Data Domain Registry

Create a domain registry in code first, then persist where needed.

New file:

```text
src/lib/master-data/domains.ts
```

Each domain definition:

```ts
type MasterDataDomain =
  | "INVENTORY"
  | "VEHICLE"
  | "DESIGN"
  | "COLOR"
  | "SUPPLIER"
  | "CUSTOMER"
  | "MACHINE"
  | "WAREHOUSE"
  | "EMPLOYEE";

type MasterDataDomainDefinition = {
  id: MasterDataDomain;
  label: string;
  description: string;
  backing: "ITEM_GROUP" | "CONCRETE_MODEL";
  supportsConfigure: boolean;
  supportsDataMode: boolean;
  steps: "domain" | "category" | "blueprint" | "form" | "preview" | "save";
};
```

Inventory uses `ItemGroup`. Concrete domains use existing tables:

- Vehicle -> `VehicleBrand`, `VehicleModel`, `VehicleGeneration`, later `VehicleYear` / `VehicleVariant`
- Design -> `Design`
- Color -> `Color`
- Supplier -> `Supplier`
- Customer -> `Customer`
- Warehouse -> `Warehouse`, `WarehouseZone`, `WarehouseRack`, `WarehouseShelf`, `WarehouseBin`
- Employee -> `User` + `EmployeeProfile`
- Machine -> add a concrete `Machine` model only if no existing equipment model can serve it

### 2. Extend ItemGroup Capabilities

Add flags to `ItemGroup` for inventory/item blueprints:

```prisma
hasBOM        Boolean @default(false)
hasQC         Boolean @default(false)
hasRouting    Boolean @default(false)
hasCAD        Boolean @default(false)
isProducible  Boolean @default(false)
isPurchasable Boolean @default(false)
isSalable     Boolean @default(false)
```

Add default attachment references:

```prisma
defaultQcTemplateId String?
defaultQcTemplate   QCTemplate? @relation(fields: [defaultQcTemplateId], references: [id], onDelete: SetNull)
defaultRouteName    String?
```

Do not overload these for vehicles/suppliers/customers. Those are concrete
system/reference domains with their own logic.

### 3. Broaden Spec Reference Targets

Extend `SpecRefTarget`:

```prisma
SUPPLIER
CUSTOMER
WAREHOUSE
WAREHOUSE_BIN
EMPLOYEE
DEPARTMENT
MACHINE
```

Update:

- `src/server/queries/spec.ts`
- `src/server/actions/spec.ts`
- `src/components/spec/SpecFieldEditor.tsx`
- `src/components/spec/SpecFieldInput.tsx`

Reference dropdowns must support dependency filters:

- Vehicle Model depends on Vehicle Brand
- Vehicle Generation depends on Vehicle Model
- Warehouse Zone depends on Warehouse
- Rack depends on Zone
- Shelf depends on Rack
- Bin depends on Shelf

### 4. Top-Level Master Data Workspace

Create:

```text
src/app/owner/master-data/page.tsx
src/app/owner/master-data/MasterDataWorkspace.tsx
```

Keep old routes as compatibility redirects:

```text
/owner/settings/master-data        -> /owner/master-data?domain=legacy
/owner/settings/master-data/studio -> /owner/master-data
/owner/settings/master-data/add    -> /owner/master-data?add=1
```

The workspace shell:

- Verity header and status pill
- left domain rail
- top Configure/Data segmented control
- prominent `+ Add Master Data`
- workbook body
- bottom tabs for active domain sections

Do not remove legacy sheet functionality until every legacy sheet has an
equivalent domain renderer.

### 5. Configure Mode

Inventory Configure Mode:

- group tree
- fields
- reference fields
- name/code templates
- capability flags
- BOM template
- default QC template
- default production route
- CAD/document requirements

Concrete domain Configure Mode:

- fixed system fields are visible but locked
- custom reference/display fields can be added only where downstream consumers support them
- hierarchy rules are shown explicitly, e.g. Vehicle = Brand -> Model -> Generation

This prevents the dangerous "everything is a meta-model" trap. The owner can
configure the factory vocabulary without breaking production logic.

### 6. Data Mode

Data Mode is a high-density workbook, not a primary add form:

- search
- filters
- sort
- CSV export/template/import dry run
- inline correction for safe fields
- row detail drawer
- related-record links

Domain-specific workbook views:

- Inventory: current `SpecDataGrid`
- Vehicle: Brand/Model/Generation tree grid
- Designs: family, design, CAD/images, fabric consumption
- Colors: color name/code/swatch
- Suppliers: profile/payment/lead time
- Customers: contact/billing/delivery
- Warehouse: warehouse -> zone -> rack -> shelf -> bin
- Employees: user profile, role, department/team
- Machine: machine, department, capacity, maintenance status

### 7. Universal Add Master Data Wizard

Replace `AddMasterDataClient` with a domain-aware wizard:

```text
Step 1: Choose Domain
Step 2: Choose Category, only when the domain requires it
Step 3: Choose Blueprint/Subtype, only when needed
Step 4: Dynamic form
Step 5: Live preview
Step 6: Save and attach defaults
```

Inventory save uses `createItemFromSpec`.

Concrete domain saves use domain-specific actions:

- `createVehicleBrand`
- `createVehicleModel`
- `createVehicleGeneration`
- `createDesign`
- `createColor`
- `createSupplier`
- `createCustomer`
- `createWarehouseNode`
- `createEmployee`
- `createMachine`

The wizard must skip unnecessary steps. Example:

- Color: Domain -> Form -> Preview -> Save
- Vehicle Model: Domain -> Vehicle Level -> Parent Brand -> Form -> Save
- Finished Good Seat Cover: Domain -> Inventory Category -> Seat Cover -> Dynamic spec -> Preview -> Save

### 8. Downstream Attachment on Save

When an inventory record is created:

- if `hasBOM`, instantiate or expose generated BOM from group template
- if `hasQC`, attach/link default QC template
- if `hasRouting`, attach/link default route profile
- if `hasCAD`, require or prompt for CAD/design references
- if `isSalable`, expose to order-taking catalog
- if `isPurchasable`, expose to purchase flows
- if `isProducible`, expose to production planning

This should be implemented as a post-create orchestrator:

```text
src/server/actions/masterDataCreate.ts
src/server/services/master-data/instantiate.ts
```

The service must be idempotent. A retry must not duplicate BOM/QC/routing
attachments.

## Lazy Implementation Order

### Phase 1: Route and Shell Unification

Goal: make the UX coherent without changing data behavior.

- Add `/owner/master-data`
- Move current studio UI into this route
- Keep links from settings as compatibility entry points
- Restore existing sheets inside the unified workspace or link them as a domain until replaced
- Add global/top-nav `+ Add Master Data` where the owner works
- Verification: `/owner/master-data`, old settings routes, and add overlay all return 200

### Phase 2: Domain-Aware Wizard Skeleton

Goal: universal flow with concrete saves delegated to existing actions.

- Add domain registry
- Replace six-root first screen with domain selection
- Preserve current inventory flow under `INVENTORY`
- Add simple domain forms for Color, Supplier, Customer using existing actions
- Add Vehicle Brand/Model/Generation flow with parent selection
- Verification: create one Inventory item, Color, Supplier, Customer, Vehicle Brand/Model/Generation

### Phase 3: Reference Target Expansion

Goal: spec fields can reference all real master domains.

- Extend `SpecRefTarget`
- Implement option loaders and dependency filters
- Update field editor target picker
- Verification: create a field referencing Supplier, Warehouse, Employee, and Vehicle cascade

### Phase 4: ItemGroup Capabilities

Goal: blueprint capabilities drive downstream visibility.

- Add capability flags and default QC/routing/CAD references
- Add Configure Mode UI for capabilities
- Seed Carxen defaults for Seat Cover, Fabric, Foam, Thread, Packaging, Consumables, Trading Goods
- Verification: capability toggles persist and typecheck/build pass

### Phase 5: Default Instantiation

Goal: saving an item attaches operational defaults.

- Create post-save orchestrator
- Attach generated BOM where `hasBOM`
- Link QC template where `hasQC`
- Link route profile where `hasRouting`
- Surface CAD requirements where `hasCAD`
- Verification: saved Seat Cover shows BOM, QC profile, and route defaults from item detail

### Phase 6: Replace Legacy Sheets Domain by Domain

Goal: remove legacy only after parity exists.

Replacement order:

1. Colors
2. Suppliers
3. Customers
4. Designs
5. Vehicles
6. Warehouses
7. Employees
8. remaining inventory/system sheets

Do not delete `/owner/settings/master-data` until every row action and CSV path
has an equivalent in `/owner/master-data`.

### Phase 7: Order Studio Closure

Goal: master data actually drives orders.

- Replace old brand/design/color loose selectors in `OrdersClient`
- Use finished-good item picker
- Allow draft item minting through the same wizard
- Stop writing loose spec columns once every reader uses `SalesOrder.item`
- Only then drop legacy sales-order spec columns

## Carxen Seed Scope

Seed through idempotent scripts, not destructive resets:

- Inventory roots and subgroups: Raw Material, Semi-Finished, Finished Goods,
  Consumable, Packaging, Trading Goods
- Finished Goods: Seat Cover, Mats, Steering Cover, Neck Pillow
- Raw Materials: Fabric, Foam, Thread, Elastic, Velcro
- Consumables: Needles, Adhesive, Marker/Chalk, Machine Oil
- Packaging: Poly Bag, Carton, Label
- Trading Goods: Neck Pillow, Sun Shade, Perfume, Accessories
- Vehicles: Brand -> Model -> Generation
- Designs: Family -> Design with CAD/image URLs and fabric consumption
- Colors: name, code, swatch
- Suppliers: contact, GST/PAN, lead time, payment terms
- Customers: contact, address, type
- Warehouse: warehouse -> zone -> rack -> shelf -> bin
- Employees: user, role, department/team
- Machines: department, capacity, maintenance status

## Acceptance Criteria

- Owner can open `/owner/master-data` directly from primary navigation.
- Settings no longer feels like the only access path.
- `+ Add Master Data` is visible in the master-data workspace and can be reused
  by order-taking draft creation.
- The wizard can create at least: Seat Cover, Fabric, Vehicle Brand, Vehicle
  Model, Vehicle Generation, Design, Color, Supplier, Customer, Warehouse, Employee.
- Configure Mode can edit fields, references, naming/code templates,
  capabilities, BOM, QC, routing, and CAD defaults for item blueprints.
- Data Mode can search/export/import or safely edit the same domains currently
  available in legacy sheets.
- No legacy sheet is removed before parity is proven.
- `npm run typecheck` and `npm run build` pass after every phase.

