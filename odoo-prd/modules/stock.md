# Module: Inventory (Stock)

## Purpose
The `stock` module controls the physical storage, movement, tracking, and valuation of materials and merchandise inside warehouses and locations.

## Scope
- Defines physical, virtual, and partner-centric inventory locations.
- Executes and monitors stock shipments, receipts, and internal transfers (Pickings).
- Handles batch picking, serial/lot tracking, and automated packaging.
- Inherits collaborative capabilities (Chatter) from `mail`.

## Major Entities

### 1. Warehouse (`stock.warehouse`)
- **Type**: Persistent Model.
- **Purpose**: Represents a physical building containing warehouses.
- **Fields**:
  - `name`: Human-readable name.
  - `code`: Short code prefix (e.g., `WH`).
  - `view_location_id`: Parent location node for all locations inside the warehouse.

### 2. Location (`stock.location`)
- **Type**: Persistent Model.
- **Purpose**: Represents hierarchical sub-locations (aisles, shelves, bins) or virtual nodes.
- **Fields**:
  - `name`: Name of the zone.
  - `location_id`: Parent location (`Many2one`).
  - `usage`: Usage type (`internal` for storage, `customer` for destinations, `supplier` for source vendor nodes, `inventory` for stock loss reconciliations).

### 3. Stock Picking (`stock.picking`)
- **Type**: Persistent Model.
- **Purpose**: Document representing standard movements (Delivery Orders, Receipts, Internal Transfers).
- **Fields**:
  - `name`: Sequential identifier (e.g. `WH/OUT/0001`).
  - `picking_type_id`: Operation type configuration (e.g. receipt vs delivery).
  - `location_id` / `location_dest_id`: Source and destination locations.
  - `state`: Enumerable status (`draft`, `waiting`, `confirmed`, `assigned`, `done`, `cancel`).

### 4. Stock Move (`stock.move`)
- **Type**: Persistent Model.
- **Purpose**: Represents planned product quantities moving between source and destination.

### 5. Stock Move Line (`stock.move.line`)
- **Type**: Persistent Model.
- **Purpose**: Tracks actual executed product movements. Essential for lot/serial numbering and packaging tracking.

## Core Workflows
- **Stock Reservation**:
  - Transition: `confirmed` → `assigned` via `action_assign()`.
  - Mechanics: The reservation engine checks product stock levels in the source location. If quantity is available, the system locks that quantity for this picking (cannot be sold or shipped by another picker).
- **Stock Validation**:
  - Transition: `assigned` → `done` via `button_validate()`.
  - Side effects:
    - Decrements stock balance from source location, increments stock balance in destination.
    - Updates forecasted product quantities.

## Permissions
- Model Access is defined in `addons/stock/security/ir.model.access.csv`.
- **Groups**:
  - `stock.group_stock_user`: Can read/create/edit pickings, locations, and run standard inventory operations.
  - `stock.group_stock_manager`: Can manage configuration, warehouse routes, inventory valuations, and adjust ledger counts.
