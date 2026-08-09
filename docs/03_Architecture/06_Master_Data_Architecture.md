# Verity Master Data Architecture

## Philosophy

Verity is **not** a traditional ERP.

Traditional ERPs are built around isolated modules:

```
Products  |  Materials  |  Customers  |  Suppliers  |  Vehicles  |  Designs  |  Colors
```

Every module in a legacy ERP owns its own data model, forms, workflows, and hardcoded business logic.

Verity is the exact opposite: **Master Data is the foundation of the Factory Operating System.**

Everything else—Orders, Inventory, Production, Purchase, QC, Dispatch, Costing, and Reporting—consumes Master Data instead of defining its own siloed structures.

The application understands the factory because the factory owner configured it—not because software developers hardcoded business rules into application source code.

---

## Core Paradigm: The Lifecycle Chain

Everything in Verity follows the exact same operational lifecycle:

```
Blueprint
  ↓
Configuration
  ↓
Master Data Record
  ↓
Relationships
  ↓
Transactions
```

1. **Blueprint**: Defines *what something is* (schema, rules, templates, capabilities, relationships).
2. **Configuration**: The owner's initial setup of factory metadata.
3. **Master Data Record**: An actual instance created from a blueprint via the dynamic engine.
4. **Relationships**: Connections between records (e.g. Finished Good → Fabric, Vehicle, QC Profile).
5. **Transactions**: Operational workflows (Sales, Production, Purchase, Stock movements) that consume records without redefining them.

---

## Master Data Studio Architecture

There is **only one Master Data Studio**.

Verity explicitly rejects separate application modules for entity management:

```
❌ Product Master
❌ Item Master
❌ Vehicle Master
❌ Fabric Master
```

Everything belongs inside the unified Master Data Studio.

### Two Distinct Responsibilities

The Master Data Studio is **not** where workers spend their day manually typing records. It serves two distinct purposes:

1. **Configuration Mode**: Used primarily by factory owners/admin to configure the schema of the factory (Fields, Relationships, Validation, Naming Rules, Code Rules, Capabilities, and Templates for BOM, QC, & Routing).
2. **Data Mode**: A spreadsheet-like workbook view designed for searching, filtering, bulk editing, auditing, and importing/exporting data.

```
+-----------------------------------------------------------------------+
|                         MASTER DATA STUDIO                            |
| +----------------------------------+ +------------------------------+ |
| |        CONFIGURE MODE            | |          DATA MODE           | |
| |  (Blueprints, Schemas, Templates)| | (Workbook Grid, Filters, CSV)| |
| +----------------------------------+ +------------------------------+ |
+-----------------------------------------------------------------------+
```

---

## Universal "Add Master Data" Creation Flow

To maintain schema strictness and eliminate manual entry errors, record creation does **not** happen directly inside raw sheet cells.

Instead, all records across the entire application are created through **one universal creation flow**:

```
[ + Add Master Data ]
```

### The 6-Step Universal Wizard Workflow

```
Step 1: Choose Entity Domain
   (Inventory, Vehicle, Design, Color, Supplier, Customer, Machine, Warehouse, Employee)
  │
Step 2: Choose System Category (If Inventory selected)
   (Raw Material, Semi Finished, Finished Goods, Consumable, Packaging, Trading Goods)
  │
Step 3: Choose Subcategory / Blueprint
   (e.g., Seat Cover, Floor Mats, Steering Cover under Finished Goods)
  │
Step 4: Dynamic Blueprint Form Render
   (Renders fields, dropdowns, and reference selectors dynamically from metadata)
  │
Step 5: Real-time Live Preview
   (Generates deterministic Item Name & Item Code live as choices are made)
  │
Step 6: Instantiation & Hash Identity
   (Creates record with a calculated specHash to guarantee zero duplicates)
```

---

## Metadata Engine: Blueprints & Schema Definitions

A **Blueprint** defines the complete schema and behavior of a subcategory or entity type.

### Structural Anatomy of a Blueprint

| Component | Description | Example (Finished Good: Seat Cover) |
|---|---|---|
| **Fields** | Attributes and data types | Brand, Model, Generation, Back Type, Headrests, Armrest |
| **References** | Links to other Master Data entities | Vehicle, Fabric, Design, Color |
| **Naming Rule** | Expression renderer for Name | `Seat Cover {Brand} {Model} {Gen} {BackType} {Design} {Color}` |
| **Code Rule** | Expression renderer for Item Code | `FG-SC-{BrandCode}-{ModelCode}-{Seq}` |
| **Capabilities** | Operational flags for downstream modules | `Inventory: true`, `Production: true`, `BOM: true`, `QC: true` |
| **Templates** | Default execution specs | Default BOM Template, QC Profile, Routing Path |

### Blueprint Schema Capabilities Matrix

Downstream modules in Verity automatically enable or disable workflows based on item **Capabilities** rather than hardcoded string types:

```
┌─────────────────┬───────────┬────────────┬──────┬──────┬──────────┬──────────┐
│ Blueprint       │ Inventory │ Production │ BOM  │ QC   │ Purchase │ Sales    │
├─────────────────┼───────────┼────────────┼──────┼──────┼──────────┼──────────┤
│ Seat Cover      │    ✓      │     ✓      │  ✓   │  ✓   │    ✗     │    ✓     │
│ Leather Fabric  │    ✓      │     ✗      │  ✗   │  ✓   │    ✓     │    ✗     │
│ Thread          │    ✓      │     ✗      │  ✗   │  ✗   │    ✓     │    ✗     │
│ Car Perfume     │    ✓      │     ✗      │  ✗   │  ✗   │    ✓     │    ✓     │
└─────────────────┴───────────┴────────────┴──────┴──────┴──────────┴──────────┘
```

---

## Downstream Operational Flow (Transaction Execution)

Once Master Data is configured, operational modules require zero repetitive data entry:

```
┌───────────────────┐     Selects Master Record     ┌────────────────────────┐
│   Sales Order     │ ────────────────────────────> │  Finished Good Record  │
└───────────────────┘                               └────────────────────────┘
                                                                │
                                              Populates BOM, Routing & QC Automatically
                                                                │
                                                                ▼
┌───────────────────┐     Consumes Master Specs     ┌────────────────────────┐
│ Production Job    │ <──────────────────────────── │  BOM & Material Specs  │
└───────────────────┘                               └────────────────────────┘
```

* **Sales Orders**: Selecting an item automatically loads pricing, specs, and default packaging.
* **Production**: Creating a job automatically loads the item's configured BOM, CAD patterns, Routing steps, and QC checklists.
* **Purchasing**: Ordering raw materials automatically resolves approved suppliers, minimum order quantities, and unit costs.

---

## Architectural Extensibility & Scalability

When a factory expands into new product lines (e.g. Sofa Covers, Helmets, Bus Seats):

1. **Zero Code Changes**: Developers do **not** write new components, database models, or backend controllers.
2. **Schema Creation**: The factory admin creates a new Subcategory & Blueprint inside Master Data Studio.
3. **Operational Readiness**: The Universal Add Master Data wizard and downstream modules (BOM, QC, Production) immediately recognize and execute the new entity type via Verity's metadata engine.
