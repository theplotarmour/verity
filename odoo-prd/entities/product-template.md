# Entity: Product Template (product.template)

## Purpose
Exhaustive functional and schema specification of the `product.template` entity.

## Fields Inventory
The following table lists every field declared in the source code file:

| Field Name | Type | String Label | Required? | Compute Method | Related Path |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `name` | Char |  | True | `` | `` |
| `sequence` | Integer |  | False | `` | `` |
| `description` | Html |  | False | `` | `` |
| `description_purchase` | Text |  | False | `` | `` |
| `description_sale` | Text |  | False | `` | `` |
| `type` | Selection | Product Type | True | `` | `` |
| `combo_ids` | Many2many | Combo Choices | False | `` | `` |
| `service_tracking` | Selection | Create on Order | True | `_compute_service_tracking` | `` |
| `categ_id` | Many2one | Product Category | False | `` | `` |
| `currency_id` | Many2one |  | False | `_compute_currency_id` | `` |
| `cost_currency_id` | Many2one |  | False | `_compute_cost_currency_id` | `` |
| `list_price` | Float |  | False | `` | `` |
| `standard_price` | Float |  | False | `_compute_standard_price` | `` |
| `volume` | Float |  | False | `_compute_volume` | `` |
| `volume_uom_name` | Char | Volume unit of measure label | False | `_compute_volume_uom_name` | `` |
| `weight` | Float |  | False | `_compute_weight` | `` |
| `weight_uom_name` | Char | Weight unit of measure label | False | `_compute_weight_uom_name` | `` |
| `sale_ok` | Boolean |  | False | `` | `` |
| `purchase_ok` | Boolean |  | False | `_compute_purchase_ok` | `` |
| `uom_id` | Many2one |  | True | `` | `` |
| `uom_ids` | Many2many | Packagings | False | `` | `` |
| `uom_name` | Char | Unit Name | False | `` | `uom_id.name` |
| `company_id` | Many2one |  | False | `` | `` |
| `seller_ids` | One2many |  | False | `` | `` |
| `variant_seller_ids` | One2many |  | False | `` | `` |
| `active` | Boolean |  | False | `` | `` |
| `color` | Integer |  | False | `` | `` |
| `is_product_variant` | Boolean | Is a product variant | False | `_compute_is_product_variant` | `` |
| `attribute_line_ids` | One2many |  | False | `` | `` |
| `valid_product_template_attribute_line_ids` | Many2many | Valid Product Attribute Lines | False | `_compute_valid_product_template_attribute_line_ids` | `` |
| `import_attribute_values` | Char | Product Values | False | `_compute_import_attribute_values` | `` |
| `product_variant_ids` | One2many |  | True | `` | `` |
| `product_variant_id` | Many2one |  | False | `_compute_product_variant_id` | `` |
| `product_variant_count` | Integer |  | False | `_compute_product_variant_count` | `` |
| `barcode` | Char |  | False | `_compute_barcode` | `` |
| `default_code` | Char |  | False | `_compute_default_code` | `` |
| `pricelist_rule_ids` | One2many | Pricelist Rules | False | `` | `` |
| `product_document_ids` | One2many | Documents | False | `` | `` |
| `product_document_count` | Integer | Documents Count | False | `_compute_product_document_count` | `` |
| `can_image_1024_be_zoomed` | Boolean |  | False | `_compute_can_image_1024_be_zoomed` | `` |
| `has_configurable_attributes` | Boolean |  | False | `_compute_has_configurable_attributes` | `` |
| `is_dynamically_created` | Boolean |  | False | `_compute_is_dynamically_created` | `` |
| `product_tooltip` | Char |  | False | `_compute_product_tooltip` | `` |
| `is_favorite` | Boolean | Favorite | False | `` | `` |
| `product_tag_ids` | Many2many | Tags | False | `` | `` |
| `product_properties` | Properties |  | False | `` | `` |
| `column_no` | index |  | False | `` | `` |

## Relationships
- Relational dependencies are mapped via `Many2one`, `One2many`, and `Many2many` fields in the table above.
- Cascade deletions and database-level foreign keys are enforced by PostgreSQL according to Odoo ORM registry rules.

## Validation & Business Rules
- **Python Constraints**: Defined via `@api.constrains` in the python source file.
- **SQL Constraints**: Defined via `_sql_constraints` in the model definition.
- **Null Enforcements**: Fields where `Required?` is `True` are validated at transaction commit.

## Traceability
- **Source Module**: `product`
- **Model Path**: `addons/product/models/product_template.py`
- **Confidence**: HIGH
