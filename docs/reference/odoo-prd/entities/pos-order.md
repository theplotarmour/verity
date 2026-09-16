# Entity: POS Order (pos.order)

## Purpose
Exhaustive functional and schema specification of the `pos.order` entity.

## Fields Inventory
The following table lists every field declared in the source code file:

| Field Name | Type | String Label | Required? | Compute Method | Related Path |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `name` | Char | Order Ref | True | `` | `` |
| `last_order_preparation_change` | Char | Last preparation change | False | `` | `` |
| `date_order` | Datetime | Date | False | `` | `` |
| `user_id` | Many2one | Employee | False | `` | `` |
| `amount_difference` | Monetary | Difference | False | `` | `` |
| `amount_tax` | Monetary | Taxes | True | `` | `` |
| `amount_total` | Monetary | Total | True | `` | `` |
| `amount_paid` | Monetary | Paid | True | `` | `` |
| `amount_return` | Monetary | Returned | True | `` | `` |
| `margin` | Monetary | Margin | False | `_compute_margin` | `` |
| `margin_percent` | Float | Margin (%) | False | `_compute_margin` | `` |
| `is_total_cost_computed` | Boolean |  | False | `_compute_is_total_cost_computed` | `` |
| `lines` | One2many | Order Lines | False | `` | `` |
| `company_id` | Many2one | Company | True | `` | `` |
| `country_code` | Char |  | False | `` | `company_id.account_fiscal_country_id.code` |
| `pricelist_id` | Many2one | Pricelist | False | `` | `` |
| `partner_id` | Many2one | Customer | False | `` | `` |
| `sequence_number` | Integer | Sequence Number | False | `` | `` |
| `session_id` | Many2one | Session | False | `` | `` |
| `config_id` | Many2one | Point of Sale | False | `_compute_order_config_id` | `` |
| `currency_id` | Many2one | Currency | False | `` | `config_id.currency_id` |
| `currency_rate` | Float |  | False | `_compute_currency_rate` | `` |
| `is_refund` | Boolean | Is Refund | False | `` | `` |
| `state` | Selection |  | False | `` | `` |
| `account_move` | Many2one | Invoice | False | `` | `` |
| `picking_ids` | One2many |  | False | `` | `` |
| `picking_count` | Integer |  | False | `_compute_picking_count` | `` |
| `failed_pickings` | Boolean |  | False | `_compute_picking_count` | `` |
| `picking_type_id` | Many2one | Operation Type | False | `` | `session_id.config_id.picking_type_id` |
| `stock_reference_ids` | Many2many | Reference | False | `` | `` |
| `preset_id` | Many2one | Preset | False | `` | `` |
| `floating_order_name` | Char | Order Name | False | `` | `` |
| `general_customer_note` | Text | General Customer Note | False | `` | `` |
| `internal_note` | Text | Internal Note | False | `` | `` |
| `nb_print` | Integer | Number of Print | False | `` | `` |
| `pos_reference` | Char | Receipt Number | False | `` | `` |
| `sale_journal` | Many2one | Sales Journal | False | `` | `session_id.config_id.journal_id` |
| `fiscal_position_id` | Many2one | Fiscal Position | False | `` | `` |
| `payment_ids` | One2many | Payments | False | `` | `` |
| `session_move_id` | Many2one | Session Journal Entry | False | `` | `session_id.move_id` |
| `to_invoice` | Boolean |  | False | `` | `` |
| `shipping_date` | Date |  | False | `` | `` |
| `preset_time` | Datetime | Hour | False | `` | `` |
| `is_invoiced` | Boolean |  | False | `_compute_is_invoiced` | `` |
| `is_tipped` | Boolean |  | False | `` | `` |
| `tip_amount` | Monetary | Tip Amount | False | `` | `` |
| `refund_orders_count` | Integer |  | False | `_compute_refund_related_fields` | `` |
| `refunded_order_id` | Many2one |  | False | `_compute_refund_related_fields` | `` |
| `has_refundable_lines` | Boolean |  | False | `_compute_has_refundable_lines` | `` |
| `ticket_code` | Char |  | False | `` | `` |
| `tracking_number` | Char | Order Number | False | `` | `` |
| `uuid` | Char | Uuid | False | `` | `` |
| `email` | Char | Email | False | `_compute_contact_details` | `` |
| `mobile` | Char | Mobile | False | `_compute_contact_details` | `` |
| `is_edited` | Boolean | Edited | False | `_compute_is_edited` | `` |
| `has_deleted_line` | Boolean | Has Deleted Line | False | `` | `` |
| `order_edit_tracking` | Boolean |  | False | `` | `config_id.order_edit_tracking` |
| `available_payment_method_ids` | Many2many | Available Payment Methods | False | `` | `config_id.payment_method_ids` |
| `invoice_status` | Selection | Invoice Status | False | `_compute_invoice_status` | `` |
| `reversed_move_ids` | One2many | Reversal Account Moves | False | `` | `` |
| `source` | Selection | Origin | False | `` | `` |
| `company_id` | Many2one | Company | False | `` | `order_id.company_id` |
| `name` | Char | Line No | True | `` | `` |
| `notice` | Char | Discount Notice | False | `` | `` |
| `product_id` | Many2one | Product | True | `` | `` |
| `attribute_value_ids` | Many2many | Selected Attributes | False | `` | `` |
| `custom_attribute_value_ids` | One2many | Custom Values | False | `` | `` |
| `price_unit` | Float | Unit Price | False | `` | `` |
| `qty` | Float |  | False | `` | `` |
| `price_subtotal` | Monetary | Tax Excl. | True | `` | `` |
| `price_subtotal_incl` | Monetary | Tax Incl. | True | `` | `` |
| `price_extra` | Float | Price extra | False | `` | `` |
| `price_type` | Selection | Price Type | False | `` | `` |
| `margin` | Monetary | Margin | False | `_compute_margin` | `` |
| `margin_percent` | Float | Margin (%) | False | `_compute_margin` | `` |
| `total_cost` | Float | Total cost | False | `` | `` |
| `is_total_cost_computed` | Boolean |  | False | `` | `` |
| `discount` | Float | Discount (%) | False | `` | `` |
| `order_id` | Many2one | Order Ref | True | `` | `` |
| `tax_ids` | Many2many | Taxes | False | `` | `` |
| `tax_ids_after_fiscal_position` | Many2many | Taxes to Apply | False | `_get_tax_ids_after_fiscal_position` | `` |
| `pack_lot_ids` | One2many | Lot/serial Number | False | `` | `` |
| `product_uom_id` | Many2one | Product Unit | False | `` | `product_id.uom_id` |
| `currency_id` | Many2one |  | False | `` | `order_id.currency_id` |
| `full_product_name` | Char |  | False | `` | `` |
| `customer_note` | Char |  | False | `` | `` |
| `refund_orderline_ids` | One2many |  | False | `` | `` |
| `refunded_orderline_id` | Many2one |  | False | `` | `` |
| `refunded_qty` | Float |  | False | `_compute_refund_qty` | `` |
| `uuid` | Char | Uuid | False | `` | `` |
| `note` | Char |  | False | `` | `` |
| `combo_parent_id` | Many2one | Combo Parent | False | `` | `` |
| `combo_line_ids` | One2many | Combo Lines | False | `` | `` |
| `combo_item_id` | Many2one | Combo Item | False | `` | `` |
| `is_edited` | Boolean |  | False | `` | `` |
| `extra_tax_data` | Json |  | False | `` | `` |
| `pos_order_line_id` | Many2one |  | False | `` | `` |
| `order_id` | Many2one |  | False | `` | `pos_order_line_id.order_id` |
| `lot_name` | Char |  | False | `` | `` |
| `product_id` | Many2one |  | False | `` | `pos_order_line_id.product_id` |

## Relationships
- Relational dependencies are mapped via `Many2one`, `One2many`, and `Many2many` fields in the table above.
- Cascade deletions and database-level foreign keys are enforced by PostgreSQL according to Odoo ORM registry rules.

## Validation & Business Rules
- **Python Constraints**: Defined via `@api.constrains` in the python source file.
- **SQL Constraints**: Defined via `_sql_constraints` in the model definition.
- **Null Enforcements**: Fields where `Required?` is `True` are validated at transaction commit.

## Traceability
- **Source Module**: `point_of_sale`
- **Model Path**: `addons/point_of_sale/models/pos_order.py`
- **Confidence**: HIGH
