# Module: Manufacturing (MRP)

## Purpose
The `mrp` module governs the transformation of raw materials and components into finished products using Bills of Materials, Work Centers, and routing operations.

## Scope
- Defines Bills of Materials (BoMs) for multi-level product assemblies.
- Creates and tracks Manufacturing Orders (MOs) and Work Orders.
- Manages Work Centers and calculates machine and labor capacity.
- Integrates with Inventory for material consumption and product receipts.

## Major Entities

### 1. Bill of Materials (`mrp.bom`)
- **Type**: Persistent Model.
- **Purpose**: Defines the list of components and routing operations required to build a product.
- **Fields**:
  - `product_tmpl_id`: The product to produce (`Many2one` to `product.template`).
  - `bom_line_ids`: Components list (`One2many` to `mrp.bom.line`).
  - `type`: Enumerable (`normal` for standard assembly, `phantom` for kits).

### 2. Manufacturing Order (`mrp.production`)
- **Type**: Persistent Model.
- **Purpose**: Tracks the execution sheet to produce finished goods.
- **Fields**:
  - `name`: Sequence code (e.g. `WH/MO/00001`).
  - `product_id`: Target product variant to produce (`Many2one`).
  - `product_qty`: Quantity to manufacture.
  - `bom_id`: Origin BoM (`Many2one`).
  - `state`: Enumerable status (`draft`, `confirmed`, `progress`, `to_close`, `done`, `cancel`).

### 3. Work Center (`mrp.workcenter`)
- **Type**: Persistent Model.
- **Purpose**: Represents physical workstations where operations occur.

## Core Workflows
- **Manufacturing Execution**:
  - **Confirm MO**: Transitions MO state to `confirmed`. Automatically creates raw material stock moves (`stock.move`) to reserve components in the warehouse.
  - **Produce & Close**: Consumes component items, registers finished quantities, and validates finished product receipts, transferring them to the warehouse storage location.

## Permissions
- Model Access is defined in `addons/mrp/security/ir.model.access.csv`.
- **Groups**:
  - `mrp.group_mrp_user`: Can edit and validate work orders and manufacturing worksheets.
  - `mrp.group_mrp_manager`: Full access to configure work centers, routing steps, and BoMs.

## Traceability
- **Module Directory**: `addons/mrp`
- **Model Path**: `addons/mrp/models/mrp_production.py`
