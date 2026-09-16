# Module: Point of Sale (POS)

## Purpose
The `point_of_sale` module runs the front-end retail checkout and restaurant system, handling cash registers, payment terminals, sessions, and transaction synchronization.

## Scope
- Operates offline-capable browser-based checkout clients.
- Manages POS Sessions (`pos.session`) and cash registries.
- Creates and synchronizes POS Sales Orders (`pos.order`).
- Inherits inventory and accounting logic to deduct stock and record journal transactions at session closure.

## Major Entities

### 1. POS Session (`pos.session`)
- **Type**: Persistent Model.
- **Purpose**: Controls the open/closed lifespan of a cash register.
- **Fields**:
  - `config_id`: Linked configuration settings (`Many2one`).
  - `user_id`: Operator / Cashier (`Many2one`).
  - `state`: Enumerable status (`new_session`, `opening_control`, `opened`, `closing_control`, `closed`).

### 2. POS Order (`pos.order`)
- **Type**: Persistent Model.
- **Purpose**: Sales ticket generated at checkouts.
- **Fields**:
  - `name`: Ticket number.
  - `session_id`: Originating session (`Many2one`).
  - `lines`: Order items (`One2many` to `pos.order.line`).
  - `amount_total`: Order total.

## Core Workflows
- **Session Closure & Reconciliation**:
  - Transition: `opened` → `closed` via session closure actions.
  - Side effects:
    - Creates standard accounting entries (`account.move`) summarizing session sales, cash variances, and bank payments.
    - Triggers inventory moves (`stock.move`) to deduct sold quantities from the POS shop warehouse location.

## Permissions
- Model Access is defined in `addons/point_of_sale/security/ir.model.access.csv`.
- **Groups**:
  - `point_of_sale.group_pos_user`: Cashier level. Can open sessions and log orders.
  - `point_of_sale.group_pos_manager`: Manager level. Can configure shop terminals, products, prices, and override registers.

## Traceability
- **Module Directory**: `addons/point_of_sale`
- **Model Path**: `addons/point_of_sale/models/pos_order.py`
