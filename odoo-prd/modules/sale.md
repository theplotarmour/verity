# Module: Sales

## Purpose
The `sale` module manages the customer sales lifecycle from initial pricing quotation to customer confirmation, delivery tracking, and invoice initiation.

## Scope
- Creates and manages Customer Quotations and Sales Orders.
- Incorporates dynamic price lists and customer-specific discounts.
- Triggers downstream warehouse deliveries and customer invoicing processes.
- Inherits collaborative capabilities (Chatter) from `mail`.

## Major Entities

### 1. Sales Order (`sale.order`)
- **Type**: Persistent Model.
- **Purpose**: Represents a commercial quotation or a confirmed order.
- **Fields**:
  - `name`: Sequential identifier (e.g. `SO0001`).
  - `partner_id`: Customer (`res.partner`).
  - `state`: Enumerable status (`draft`, `sent`, `sale`, `done`, `cancel`).
  - `order_line`: Lines container (`One2many`).
  - `amount_untaxed` / `amount_tax` / `amount_total`: Currency-precision monetary sums.
  - `invoice_status`: Computed state (`no`, `to invoice`, `invoiced`).

### 2. Sales Order Line (`sale.order.line`)
- **Type**: Persistent Model.
- **Purpose**: Individual item lines sold.
- **Fields**:
  - `order_id`: Parent order (`Many2one`).
  - `product_id`: Product variant sold (`Many2one`).
  - `product_uom_qty`: Quantity sold.
  - `price_unit`: Price per unit.
  - `tax_id`: Applied taxes (`Many2many`).
  - `price_subtotal`: Computed line net value.

## Core Workflows
- **Quotation Confirmation**:
  - Transition: `draft` / `sent` → `sale` via `action_confirm()`.
  - Validations:
    - Order must contain lines.
    - Credit limits of the customer (`partner_id.credit_limit`) are evaluated; warning triggers if exceeded.
  - Downstream effects:
    - Generates a delivery picking in `stock`.
    - Updates the Sales Team statistics.

## Permissions
- Model Access is defined in `addons/sale/security/ir.model.access.csv`.
- **Groups**:
  - `sales_team.group_sale_salesman`: Can read/create/edit their own sales orders and quotations.
  - `sales_team.group_sale_manager`: Can read/write/create/delete all orders and configure global pricing tables.

## Traceability
- **Module Directory**: `addons/sale`
- **Model Files**: `addons/sale/models/*.py`
