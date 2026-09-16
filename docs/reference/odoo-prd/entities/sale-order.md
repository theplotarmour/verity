# Entity: Sales Order (sale.order)

## Purpose
Exhaustive functional and schema specification of the `sale.order` entity.

## Fields Inventory
The following table lists every field declared in the source code file:

| Field Name | Type | String Label | Required? | Compute Method | Related Path |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `name` | Char | Order Reference | True | `` | `` |
| `company_id` | Many2one |  | True | `` | `` |
| `partner_id` | Many2one | Customer | True | `` | `` |
| `state` | Selection | Status | False | `` | `` |
| `locked` | Boolean |  | False | `` | `` |
| `has_archived_products` | Boolean |  | False | `_compute_has_archived_products` | `` |
| `client_order_ref` | Char | Customer Reference | False | `` | `` |
| `create_date` | Datetime | Creation Date | False | `` | `` |
| `commitment_date` | Datetime | Delivery Date | False | `` | `` |
| `date_order` | Datetime | Order Date | True | `` | `` |
| `origin` | Char | Source Document | False | `` | `` |
| `reference` | Char | Payment Ref. | False | `` | `` |
| `pending_email_template_id` | Many2one | Pending Email Template | False | `` | `` |
| `require_signature` | Boolean | Online signature | False | `_compute_require_signature` | `` |
| `require_payment` | Boolean | Online payment | False | `_compute_require_payment` | `` |
| `prepayment_percent` | Float | Prepayment percentage | False | `_compute_prepayment_percent` | `` |
| `signature` | Image | Signature | False | `` | `` |
| `signed_by` | Char | Signed By | False | `` | `` |
| `signed_on` | Datetime | Signed On | False | `` | `` |
| `validity_date` | Date | Expiration | False | `_compute_validity_date` | `` |
| `journal_id` | Many2one | Invoicing Journal | False | `_compute_journal_id` | `` |
| `note` | Html | Terms and conditions | False | `_compute_note` | `` |
| `partner_invoice_id` | Many2one | Invoice Address | True | `_compute_partner_invoice_id` | `` |
| `partner_shipping_id` | Many2one | Delivery Address | True | `_compute_partner_shipping_id` | `` |
| `fiscal_position_id` | Many2one | Fiscal Position | False | `_compute_fiscal_position_id` | `` |
| `payment_term_id` | Many2one | Payment Terms | False | `_compute_payment_term_id` | `` |
| `preferred_payment_method_line_id` | Many2one | Payment Method | False | `_compute_preferred_payment_method_line_id` | `` |
| `pricelist_id` | Many2one | Pricelist | False | `_compute_pricelist_id` | `` |
| `currency_id` | Many2one |  | False | `_compute_currency_id` | `` |
| `currency_rate` | Float | Currency Rate | False | `_compute_currency_rate` | `` |
| `user_id` | Many2one | Salesperson | False | `_compute_user_id` | `` |
| `team_id` | Many2one | Sales Team | False | `_compute_team_id` | `` |
| `order_line` | One2many | Order Lines | False | `` | `` |
| `amount_untaxed` | Monetary | Untaxed Amount | False | `_compute_amounts` | `` |
| `amount_tax` | Monetary | Taxes | False | `_compute_amounts` | `` |
| `amount_total` | Monetary | Total | False | `_compute_amounts` | `` |
| `amount_to_invoice` | Monetary | Un-invoiced Balance | False | `_compute_amount_to_invoice` | `` |
| `amount_invoiced` | Monetary | Already invoiced | False | `_compute_amount_invoiced` | `` |
| `invoice_count` | Integer | Invoice Count | False | `_get_invoiced` | `` |
| `invoice_ids` | Many2many | Invoices | False | `_get_invoiced` | `` |
| `invoice_status` | Selection | Invoice Status | False | `_compute_invoice_status` | `` |
| `sale_warning_text` | Text |  | False | `_compute_sale_warning_text` | `` |
| `transaction_ids` | Many2many | Transactions | False | `` | `` |
| `authorized_transaction_ids` | Many2many | Authorized Transactions | False | `_compute_authorized_transaction_ids` | `` |
| `has_authorized_transaction_ids` | Boolean | Has Authorized Transactions | False | `_compute_authorized_transaction_ids` | `` |
| `amount_paid` | Float | Payment Transactions Amount | False | `_compute_amount_paid` | `` |
| `campaign_id` | Many2one |  | False | `` | `` |
| `medium_id` | Many2one |  | False | `` | `` |
| `source_id` | Many2one |  | False | `` | `` |
| `tag_ids` | Many2many | Tags | False | `` | `` |
| `amount_undiscounted` | Float | Amount Before Discount | False | `_compute_amount_undiscounted` | `` |
| `country_code` | Char | Country code | False | `` | `company_id.account_fiscal_country_id.code` |
| `company_price_include` | Selection |  | False | `` | `company_id.account_price_include` |
| `duplicated_order_ids` | Many2many |  | False | `_compute_duplicated_order_ids` | `` |
| `expected_date` | Datetime | Expected Date | False | `_compute_expected_date` | `` |
| `is_expired` | Boolean | Is Expired | False | `_compute_is_expired` | `` |
| `partner_credit_warning` | Text |  | False | `_compute_partner_credit_warning` | `` |
| `tax_calculation_rounding_method` | Selection |  | False | `` | `company_id.tax_calculation_rounding_method` |
| `tax_country_id` | Many2one |  | False | `_compute_tax_country_id` | `` |
| `tax_totals` | Binary |  | False | `_compute_tax_totals` | `` |
| `terms_type` | Selection |  | False | `` | `company_id.terms_type` |
| `type_name` | Char | Type Name | False | `_compute_type_name` | `` |
| `show_update_fpos` | Boolean | Has Fiscal Position Changed | False | `` | `` |
| `has_active_pricelist` | Boolean |  | False | `_compute_has_active_pricelist` | `` |
| `show_update_pricelist` | Boolean | Has Pricelist Changed | False | `` | `` |

## Relationships
- Relational dependencies are mapped via `Many2one`, `One2many`, and `Many2many` fields in the table above.
- Cascade deletions and database-level foreign keys are enforced by PostgreSQL according to Odoo ORM registry rules.

## Validation & Business Rules
- **Python Constraints**: Defined via `@api.constrains` in the python source file.
- **SQL Constraints**: Defined via `_sql_constraints` in the model definition.
- **Null Enforcements**: Fields where `Required?` is `True` are validated at transaction commit.

## Traceability
- **Source Module**: `sale`
- **Model Path**: `addons/sale/models/sale_order.py`
- **Confidence**: HIGH
