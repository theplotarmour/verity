# Entity: Manufacturing Order (mrp.production)

## Purpose
Exhaustive functional and schema specification of the `mrp.production` entity.

## Fields Inventory
The following table lists every field declared in the source code file:

| Field Name | Type | String Label | Required? | Compute Method | Related Path |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `name` | Char |  | True | `` | `` |
| `production_ids` | One2many | Productions | False | `` | `` |
| `child_ids` | Many2many | Child Manufacturing Orders | False | `` | `` |
| `parent_ids` | Many2many | Parent Manufacturing Orders | False | `` | `` |
| `name` | Char |  | False | `` | `` |
| `priority` | Selection | Priority | False | `` | `` |
| `backorder_sequence` | Integer |  | False | `` | `` |
| `origin` | Char |  | False | `` | `` |
| `product_id` | Many2one |  | True | `_compute_product_id` | `` |
| `production_group_id` | Many2one |  | False | `` | `` |
| `product_variant_attributes` | Many2many |  | False | `` | `product_id.product_template_attribute_value_ids` |
| `valid_product_template_attribute_line_ids` | Many2many |  | False | `` | `product_tmpl_id.valid_product_template_attribute_line_ids` |
| `never_product_template_attribute_value_ids` | Many2many | Never attribute values | False | `` | `` |
| `workcenter_id` | Many2one |  | False | `` | `` |
| `product_tracking` | Selection |  | False | `` | `product_id.tracking` |
| `product_tmpl_id` | Many2one |  | False | `` | `product_id.product_tmpl_id` |
| `product_qty` | Float |  | True | `_compute_product_qty` | `` |
| `allowed_uom_ids` | Many2many |  | False | `_compute_allowed_uom_ids` | `` |
| `product_uom_id` | Many2one |  | True | `_compute_uom_id` | `` |
| `lot_producing_ids` | Many2many | Lot/Serial Number | False | `` | `` |
| `qty_producing` | Float | Quantity Producing | False | `` | `` |
| `product_uom_qty` | Float | Total Quantity | False | `_compute_product_uom_qty` | `` |
| `picking_type_id` | Many2one |  | True | `_compute_picking_type_id` | `` |
| `use_create_components_lots` | Boolean |  | False | `` | `picking_type_id.use_create_components_lots` |
| `location_src_id` | Many2one |  | True | `_compute_locations` | `` |
| `warehouse_id` | Many2one |  | False | `` | `location_src_id.warehouse_id` |
| `location_dest_id` | Many2one |  | True | `_compute_locations` | `` |
| `location_final_id` | Many2one |  | False | `` | `` |
| `date_deadline` | Datetime |  | False | `_compute_date_deadline` | `` |
| `date_start` | Datetime |  | True | `` | `` |
| `date_finished` | Datetime |  | False | `_compute_date_finished` | `` |
| `duration_expected` | Float |  | False | `_compute_duration_expected` | `` |
| `duration` | Float |  | False | `_compute_duration` | `` |
| `bom_id` | Many2one |  | False | `_compute_bom_id` | `` |
| `state` | Selection | State | False | `_compute_state` | `` |
| `reservation_state` | Selection | MO Readiness | False | `_compute_reservation_state` | `` |
| `move_raw_ids` | One2many |  | False | `_compute_move_raw_ids` | `` |
| `move_finished_ids` | One2many |  | False | `_compute_move_finished_ids` | `` |
| `all_move_raw_ids` | One2many |  | False | `` | `` |
| `all_move_ids` | One2many |  | False | `` | `` |
| `move_byproduct_ids` | One2many |  | False | `_compute_move_byproduct_ids` | `` |
| `finished_move_line_ids` | One2many | Finished Product | False | `_compute_lines` | `` |
| `workorder_ids` | One2many |  | False | `_compute_workorder_ids` | `` |
| `move_dest_ids` | One2many | Stock Movements of Produced Goods | False | `` | `` |
| `unreserve_visible` | Boolean |  | False | `_compute_unreserve_visible` | `` |
| `reserve_visible` | Boolean |  | False | `_compute_unreserve_visible` | `` |
| `user_id` | Many2one |  | False | `` | `` |
| `company_id` | Many2one |  | True | `` | `` |
| `qty_produced` | Float | Quantity Produced | False | `_get_produced_qty` | `` |
| `reference_ids` | Many2many |  | False | `` | `` |
| `product_description_variants` | Char |  | False | `` | `` |
| `orderpoint_id` | Many2one |  | False | `` | `` |
| `propagate_cancel` | Boolean |  | False | `` | `` |
| `delay_alert_date` | Datetime |  | False | `_compute_delay_alert_date` | `` |
| `json_popover` | Char |  | False | `_compute_json_popover` | `` |
| `scrap_ids` | One2many |  | False | `` | `` |
| `scrap_count` | Integer | Scrap Move | False | `_compute_scrap_move_count` | `` |
| `unbuild_ids` | One2many |  | False | `` | `` |
| `unbuild_count` | Integer | Number of Unbuilds | False | `_compute_unbuild_count` | `` |
| `is_locked` | Boolean |  | False | `` | `` |
| `is_planned` | Boolean |  | False | `_compute_is_planned` | `` |
| `show_final_lots` | Boolean |  | False | `_compute_show_lots` | `` |
| `production_location_id` | Many2one |  | False | `_compute_production_location` | `` |
| `picking_ids` | Many2many | Picking associated to this manufacturing order | False | `_compute_picking_ids` | `` |
| `delivery_count` | Integer | Delivery Orders | False | `_compute_picking_ids` | `` |
| `consumption` | Selection |  | True | `` | `` |
| `mrp_production_child_count` | Integer |  | False | `_compute_mrp_production_child_count` | `` |
| `mrp_production_source_count` | Integer |  | False | `_compute_mrp_production_source_count` | `` |
| `mrp_production_backorder_count` | Integer |  | False | `_compute_mrp_production_backorder` | `` |
| `show_lock` | Boolean |  | False | `_compute_show_lock` | `` |
| `components_availability` | Char | Component Status | False | `_compute_components_availability` | `` |
| `components_availability_state` | Selection |  | False | `_compute_components_availability` | `` |
| `production_capacity` | Float |  | False | `_compute_production_capacity` | `` |
| `show_lot_ids` | Boolean |  | False | `_compute_show_lot_ids` | `` |
| `forecasted_issue` | Boolean |  | False | `_compute_forecasted_issue` | `` |
| `show_allocation` | Boolean |  | False | `_compute_show_allocation` | `` |
| `allow_workorder_dependencies` | Boolean |  | False | `` | `` |
| `show_produce` | Boolean |  | False | `_compute_show_produce` | `` |
| `show_generate_bom` | Boolean |  | False | `_compute_show_generate_bom` | `` |
| `show_produce_all` | Boolean |  | False | `_compute_show_produce` | `` |
| `is_outdated_bom` | Boolean |  | False | `` | `` |
| `is_delayed` | Boolean |  | False | `_compute_is_delayed` | `` |
| `search_date_category` | Selection | Date Category | False | `` | `` |
| `serial_numbers_count` | Integer |  | False | `_compute_serial_numbers_count` | `` |

## Relationships
- Relational dependencies are mapped via `Many2one`, `One2many`, and `Many2many` fields in the table above.
- Cascade deletions and database-level foreign keys are enforced by PostgreSQL according to Odoo ORM registry rules.

## Validation & Business Rules
- **Python Constraints**: Defined via `@api.constrains` in the python source file.
- **SQL Constraints**: Defined via `_sql_constraints` in the model definition.
- **Null Enforcements**: Fields where `Required?` is `True` are validated at transaction commit.

## Traceability
- **Source Module**: `mrp`
- **Model Path**: `addons/mrp/models/mrp_production.py`
- **Confidence**: HIGH
