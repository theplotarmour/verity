# Entity: Purchase Order (purchase.order)

## Purpose
Exhaustive functional and schema specification of the `purchase.order` entity.

## Fields Inventory
The following table lists every field declared in the source code file:

| Field Name | Type | String Label | Required? | Compute Method | Related Path |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `name` | Char |  | True | `` | `` |
| `priority` | Selection |  | False | `` | `` |
| `origin` | Char |  | False | `` | `` |
| `partner_ref` | Char |  | False | `` | `` |
| `date_order` | Datetime |  | True | `` | `` |
| `date_approve` | Datetime |  | False | `` | `` |
| `partner_id` | Many2one | Vendor | True | `` | `` |
| `dest_address_id` | Many2one | Dropship Address | False | `` | `` |
| `currency_id` | Many2one |  | True | `_compute_currency_id` | `` |
| `state` | Selection | Status | False | `` | `` |
| `locked` | Boolean |  | False | `` | `` |
| `lock_confirmed_po` | Selection |  | False | `` | `company_id.po_lock` |
| `order_line` | One2many | Order Lines | False | `` | `` |
| `acknowledged` | Boolean |  | False | `` | `` |
| `note` | Html |  | False | `` | `` |
| `partner_bill_count` | Integer |  | False | `` | `partner_id.supplier_invoice_count` |
| `invoice_count` | Integer | Bill Count | False | `_compute_invoice` | `` |
| `invoice_ids` | Many2many | Bills | False | `_compute_invoice` | `` |
| `invoice_status` | Selection | Billing Status | False | `_get_invoiced` | `` |
| `date_planned` | Datetime | Expected Arrival | False | `_compute_date_planned` | `` |
| `date_calendar_start` | Datetime |  | False | `_compute_date_calendar_start` | `` |
| `amount_untaxed` | Monetary | Untaxed Amount | False | `_amount_all` | `` |
| `tax_totals` | Binary |  | False | `_compute_tax_totals` | `` |
| `amount_tax` | Monetary | Taxes | False | `_amount_all` | `` |
| `amount_total` | Monetary | Total | False | `_amount_all` | `` |
| `amount_total_cc` | Monetary | Total in currency | False | `_amount_all` | `` |
| `fiscal_position_id` | Many2one | Fiscal Position | False | `` | `` |
| `tax_country_id` | Many2one |  | False | `_compute_tax_country_id` | `` |
| `tax_calculation_rounding_method` | Selection | Tax calculation rounding method | False | `` | `company_id.tax_calculation_rounding_method` |
| `payment_term_id` | Many2one |  | False | `` | `` |
| `incoterm_id` | Many2one |  | False | `` | `` |
| `product_id` | Many2one | Product | False | `` | `order_line.product_id` |
| `user_id` | Many2one | Buyer | False | `` | `` |
| `company_id` | Many2one |  | True | `` | `` |
| `company_currency_id` | Many2one | Company Currency | False | `` | `company_id.currency_id` |
| `country_code` | Char | Country code | False | `` | `company_id.account_fiscal_country_id.code` |
| `company_price_include` | Selection |  | False | `` | `company_id.account_price_include` |
| `currency_rate` | Float | Currency Rate | False | `_compute_currency_rate` | `` |
| `duplicated_order_ids` | Many2many |  | False | `_compute_duplicated_order_ids` | `` |
| `receipt_reminder_email` | Boolean |  | False | `_compute_receipt_reminder_email` | `` |
| `reminder_date_before_receipt` | Integer |  | False | `_compute_receipt_reminder_email` | `` |
| `is_late` | Boolean |  | False | `` | `` |
| `show_comparison` | Boolean |  | False | `_compute_show_comparison` | `` |
| `purchase_warning_text` | Text |  | False | `_compute_purchase_warning_text` | `` |

## Relationships
- Relational dependencies are mapped via `Many2one`, `One2many`, and `Many2many` fields in the table above.
- Cascade deletions and database-level foreign keys are enforced by PostgreSQL according to Odoo ORM registry rules.

## Validation & Business Rules
- **Python Constraints**: Defined via `@api.constrains` in the python source file.
- **SQL Constraints**: Defined via `_sql_constraints` in the model definition.
- **Null Enforcements**: Fields where `Required?` is `True` are validated at transaction commit.

## Traceability
- **Source Module**: `purchase`
- **Model Path**: `addons/purchase/models/purchase_order.py`
- **Confidence**: HIGH
