# Module: Purchase

## Purpose
The `purchase` module governs standard business-to-business vendor acquisitions. It tracks Requests for Quotation (RFQs), monitors incoming shipments, and matches supplier invoices against purchase agreements.

## Scope
- Creates and manages RFQs and Purchase Orders (POs).
- Tracks vendor pricing histories and agreement parameters.
- Triggers incoming shipments (warehouse receipts) and vendor billing procedures.
- Inherits collaborative capabilities (Chatter) from `mail`.

## Major Entities

### 1. Purchase Order (`purchase.order`)
- **Type**: Persistent Model.
- **Purpose**: Document representing purchase agreements or RFQ sheets.
- **Fields**:
  - `name`: Sequential identifier (e.g. `PO0001`).
  - `partner_id`: Vendor contact (`res.partner`).
  - `state`: Enumerable status (`draft`, `sent`, `to approve`, `purchase`, `done`, `cancel`).
  - `order_line`: Lines container (`One2many`).
  - `amount_total`: Currency-precision monetary sum of order.

### 2. Purchase Order Line (`purchase.order.line`)
- **Type**: Persistent Model.
- **Purpose**: Individual lines representing goods/services requested.
- **Fields**:
  - `order_id`: Parent order (`Many2one`).
  - `product_id`: Product variant purchased (`Many2one`).
  - `product_qty`: Quantity requested.
  - `price_unit`: Negotiated cost.
  - `qty_received`: Quantity physically received (synced from `stock`).
  - `qty_invoiced`: Quantity billed (synced from `account`).

## Core Workflows
- **Order Confirmation**:
  - Transition: `draft` / `sent` → `purchase` via `button_confirm()`.
  - Downstream effects:
    - Generates a `stock.picking` (Incoming Receipt) if products are storable (`detailed_type = 'product'`).
    - Enters the order line quantities in the product's forecasting ledger.

## Permissions
- Model Access is defined in `addons/purchase/security/ir.model.access.csv`.
- **Groups**:
  - `purchase.group_purchase_user`: Can read/create/edit their own RFQs and purchase orders.
  - `purchase.group_purchase_manager`: Can read/write/create/delete all purchase orders and configure purchase settings.

## Traceability
- **Module Directory**: `addons/purchase`
- **Model Files**: `addons/purchase/models/*.py`
