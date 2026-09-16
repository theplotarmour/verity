# Entity: Stock Picking (stock.picking)

## Purpose
Exhaustive functional and schema specification of the `stock.picking` entity.

## Fields Inventory
The following table lists every field declared in the source code file:

| Field Name | Type | String Label | Required? | Compute Method | Related Path |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `name` | Char |  | True | `` | `` |
| `color` | Integer |  | False | `` | `` |
| `sequence` | Integer |  | False | `` | `` |
| `sequence_id` | Many2one |  | False | `` | `` |
| `sequence_code` | Char |  | True | `` | `` |
| `default_location_src_id` | Many2one |  | True | `_compute_default_location_src_id` | `` |
| `default_location_dest_id` | Many2one |  | True | `_compute_default_location_dest_id` | `` |
| `code` | Selection |  | True | `` | `` |
| `return_picking_type_id` | Many2one |  | False | `` | `` |
| `show_entire_packs` | Boolean |  | False | `` | `` |
| `set_package_type` | Boolean |  | False | `` | `` |
| `warehouse_id` | Many2one |  | False | `_compute_warehouse_id` | `` |
| `active` | Boolean |  | False | `` | `` |
| `use_create_lots` | Boolean |  | False | `_compute_use_create_lots` | `` |
| `use_existing_lots` | Boolean |  | False | `_compute_use_existing_lots` | `` |
| `print_label` | Boolean |  | False | `_compute_print_label` | `` |
| `show_operations` | Boolean |  | False | `` | `` |
| `reservation_method` | Selection |  | True | `` | `` |
| `reservation_days_before` | Integer |  | False | `` | `` |
| `reservation_days_before_priority` | Integer |  | False | `` | `` |
| `auto_show_reception_report` | Boolean |  | False | `` | `` |
| `auto_print_delivery_slip` | Boolean |  | False | `` | `` |
| `auto_print_return_slip` | Boolean |  | False | `` | `` |
| `auto_print_product_labels` | Boolean |  | False | `` | `` |
| `product_label_format` | Selection | Product Label Format to auto-print | False | `` | `` |
| `auto_print_lot_labels` | Boolean |  | False | `` | `` |
| `lot_label_format` | Selection | Lot Label Format to auto-print | False | `` | `` |
| `auto_print_reception_report` | Boolean |  | False | `` | `` |
| `auto_print_reception_report_labels` | Boolean |  | False | `` | `` |
| `auto_print_packages` | Boolean |  | False | `` | `` |
| `auto_print_package_label` | Boolean |  | False | `` | `` |
| `package_label_to_print` | Selection |  | False | `` | `` |
| `count_picking_draft` | Integer |  | False | `_compute_picking_count` | `` |
| `count_picking_ready` | Integer |  | False | `_compute_picking_count` | `` |
| `count_picking` | Integer |  | False | `_compute_picking_count` | `` |
| `count_picking_waiting` | Integer |  | False | `_compute_picking_count` | `` |
| `count_picking_late` | Integer |  | False | `_compute_picking_count` | `` |
| `count_picking_backorders` | Integer |  | False | `_compute_picking_count` | `` |
| `count_move_ready` | Integer |  | False | `_compute_move_count` | `` |
| `hide_reservation_method` | Boolean |  | False | `_compute_hide_reservation_method` | `` |
| `barcode` | Char |  | False | `` | `` |
| `company_id` | Many2one |  | True | `` | `` |
| `create_backorder` | Selection |  | True | `` | `` |
| `show_picking_type` | Boolean |  | False | `_compute_show_picking_type` | `` |
| `picking_properties_definition` | PropertiesDefinition |  | False | `` | `` |
| `favorite_user_ids` | Many2many |  | False | `` | `` |
| `is_favorite` | Boolean | Show Operation in Overview | False | `_compute_is_favorite` | `` |
| `kanban_dashboard_graph` | Text |  | False | `_compute_kanban_dashboard_graph` | `` |
| `move_type` | Selection |  | True | `` | `` |
| `name` | Char |  | False | `` | `` |
| `origin` | Char |  | False | `` | `` |
| `note` | Html |  | False | `` | `` |
| `backorder_id` | Many2one |  | False | `` | `` |
| `backorder_ids` | One2many |  | False | `` | `` |
| `return_id` | Many2one |  | False | `` | `` |
| `return_ids` | One2many |  | False | `` | `` |
| `return_count` | Integer |  | False | `_compute_return_count` | `` |
| `move_type` | Selection |  | True | `_compute_move_type` | `` |
| `state` | Selection | Status | False | `_compute_state` | `` |
| `reference_ids` | Many2many | References | False | `` | `move_ids.reference_ids` |
| `priority` | Selection | Priority | False | `` | `` |
| `scheduled_date` | Datetime |  | False | `_compute_scheduled_date` | `` |
| `date_deadline` | Datetime |  | False | `_compute_date_deadline` | `` |
| `has_deadline_issue` | Boolean |  | False | `_compute_has_deadline_issue` | `` |
| `date_done` | Datetime |  | False | `` | `` |
| `delay_alert_date` | Datetime |  | False | `_compute_delay_alert_date` | `` |
| `json_popover` | Char |  | False | `_compute_json_popover` | `` |
| `location_id` | Many2one |  | True | `_compute_location_id` | `` |
| `location_dest_id` | Many2one |  | True | `_compute_location_id` | `` |
| `move_ids` | One2many | Stock Moves | False | `` | `` |
| `has_scrap_move` | Boolean |  | False | `_has_scrap_move` | `` |
| `picking_type_id` | Many2one |  | True | `` | `` |
| `warehouse_address_id` | Many2one |  | False | `` | `picking_type_id.warehouse_id.partner_id` |
| `picking_type_code` | Selection |  | False | `` | `picking_type_id.code` |
| `picking_type_entire_packs` | Boolean |  | False | `` | `picking_type_id.show_entire_packs` |
| `use_create_lots` | Boolean |  | False | `` | `picking_type_id.use_create_lots` |
| `use_existing_lots` | Boolean |  | False | `` | `picking_type_id.use_existing_lots` |
| `partner_id` | Many2one |  | False | `` | `` |
| `company_id` | Many2one | Company | False | `` | `picking_type_id.company_id` |
| `user_id` | Many2one |  | False | `` | `` |
| `move_line_ids` | One2many |  | False | `` | `` |
| `packages_count` | Integer |  | False | `_compute_packages_count` | `` |
| `package_history_ids` | Many2many | Transfered Packages | False | `` | `` |
| `show_check_availability` | Boolean |  | False | `_compute_show_check_availability` | `` |
| `show_allocation` | Boolean |  | False | `_compute_show_allocation` | `` |
| `owner_id` | Many2one |  | False | `` | `` |
| `printed` | Boolean |  | False | `` | `` |
| `signature` | Image |  | False | `` | `` |
| `is_signed` | Boolean |  | False | `_compute_is_signed` | `` |
| `is_locked` | Boolean |  | False | `` | `` |
| `is_date_editable` | Boolean |  | False | `_compute_is_date_editable` | `` |
| `weight_bulk` | Float |  | False | `_compute_bulk_weight` | `` |
| `shipping_weight` | Float |  | False | `_compute_shipping_weight` | `` |
| `shipping_volume` | Float |  | False | `_compute_shipping_volume` | `` |
| `product_id` | Many2one |  | False | `` | `move_ids.product_id` |
| `lot_id` | Many2one |  | False | `` | `move_line_ids.lot_id` |
| `show_operations` | Boolean |  | False | `` | `picking_type_id.show_operations` |
| `show_lots_text` | Boolean |  | False | `_compute_show_lots_text` | `` |
| `has_tracking` | Boolean |  | False | `_compute_has_tracking` | `` |
| `products_availability` | Char | Product Availability | False | `_compute_products_availability` | `` |
| `products_availability_state` | Selection |  | False | `_compute_products_availability` | `` |
| `picking_properties` | Properties |  | False | `` | `` |
| `show_next_pickings` | Boolean |  | False | `_compute_show_next_pickings` | `` |
| `search_date_category` | Selection | Date Category | False | `` | `` |
| `partner_country_id` | Many2one |  | False | `` | `partner_id.country_id` |
| `picking_warning_text` | Text |  | False | `_compute_picking_warning_text` | `` |

## Relationships
- Relational dependencies are mapped via `Many2one`, `One2many`, and `Many2many` fields in the table above.
- Cascade deletions and database-level foreign keys are enforced by PostgreSQL according to Odoo ORM registry rules.

## Validation & Business Rules
- **Python Constraints**: Defined via `@api.constrains` in the python source file.
- **SQL Constraints**: Defined via `_sql_constraints` in the model definition.
- **Null Enforcements**: Fields where `Required?` is `True` are validated at transaction commit.

## Traceability
- **Source Module**: `stock`
- **Model Path**: `addons/stock/models/stock_picking.py`
- **Confidence**: HIGH
