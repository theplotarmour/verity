# Entity: Account Move (account.move)

## Purpose
Exhaustive functional and schema specification of the `account.move` entity.

## Fields Inventory
The following table lists every field declared in the source code file:

| Field Name | Type | String Label | Required? | Compute Method | Related Path |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `name` | Char | Number | False | `_compute_name` | `` |
| `name_placeholder` | Char |  | False | `_compute_name_placeholder` | `` |
| `ref` | Char | Reference | False | `` | `` |
| `date` | Date | Date | True | `_compute_date` | `` |
| `state` | Selection | Status | True | `` | `` |
| `move_type` | Selection | Type | True | `` | `` |
| `is_storno` | Boolean |  | False | `_compute_is_storno` | `` |
| `journal_id` | Many2one | Journal | True | `_compute_journal_id` | `` |
| `journal_group_id` | Many2one | Ledger | False | `` | `` |
| `company_id` | Many2one | Company | False | `_compute_company_id` | `` |
| `line_ids` | One2many | Journal Items | False | `` | `` |
| `journal_line_ids` | One2many | Journal Items (DEPRECATED) | False | `` | `` |
| `exchange_diff_partial_ids` | One2many | Related reconciliation | False | `` | `` |
| `origin_payment_id` | Many2one | Payment | False | `` | `` |
| `matched_payment_ids` | Many2many | Matched Payments | False | `` | `` |
| `reconciled_payment_ids` | Many2many | Reconciled Payments | False | `_compute_reconciled_payment_ids` | `` |
| `payment_count` | Integer |  | False | `_compute_payment_count` | `` |
| `statement_line_id` | Many2one | Statement Line | False | `` | `` |
| `statement_id` | Many2one |  | False | `` | `statement_line_id.statement_id` |
| `adjusting_entry_origin_move_ids` | Many2many | Adjusting Entry Origin Moves | False | `` | `` |
| `adjusting_entry_origin_label` | Char |  | False | `_compute_adjusting_entry_origin_label` | `` |
| `adjusting_entry_origin_moves_count` | Integer | Adjusting Entry Origin Moves Count | False | `_compute_adjusting_entry_origin_moves_count` | `` |
| `adjusting_entries_move_ids` | Many2many | Created Adjusting Entries | False | `` | `` |
| `adjusting_entries_count` | Integer | Adjusting Entries Count | False | `_compute_adjusting_entries_count` | `` |
| `tax_cash_basis_rec_id` | Many2one | Tax Cash Basis Entry of | False | `` | `` |
| `tax_cash_basis_origin_move_id` | Many2one | Cash Basis Origin | False | `` | `` |
| `tax_cash_basis_created_move_ids` | One2many | Cash Basis Entries | False | `` | `` |
| `always_tax_exigible` | Boolean |  | False | `_compute_always_tax_exigible` | `` |
| `auto_post` | Selection | Auto-post | True | `` | `` |
| `auto_post_until` | Date | Auto-post until | False | `_compute_auto_post_until` | `` |
| `auto_post_origin_id` | Many2one | First recurring entry | False | `` | `` |
| `hide_post_button` | Boolean |  | False | `_compute_hide_post_button` | `` |
| `checked` | Boolean | Reviewed | False | `_compute_checked` | `` |
| `posted_before` | Boolean |  | False | `` | `` |
| `suitable_journal_ids` | Many2many |  | False | `_compute_suitable_journal_ids` | `` |
| `highest_name` | Char |  | False | `_compute_highest_name` | `` |
| `made_sequence_gap` | Boolean |  | False | `` | `` |
| `show_name_warning` | Boolean |  | False | `` | `` |
| `type_name` | Char |  | False | `_compute_type_name` | `` |
| `country_code` | Char |  | False | `` | `company_id.account_fiscal_country_id.code` |
| `account_fiscal_country_group_codes` | Json |  | False | `` | `company_id.account_fiscal_country_group_codes` |
| `company_price_include` | Selection |  | False | `` | `company_id.account_price_include` |
| `attachment_ids` | One2many | Attachments | False | `` | `` |
| `audit_trail_message_ids` | One2many | Audit Trail Messages | False | `` | `` |
| `no_followup` | Boolean | No Follow-Up | False | `_compute_no_followup` | `` |
| `restrict_mode_hash_table` | Boolean |  | False | `` | `journal_id.restrict_mode_hash_table` |
| `secure_sequence_number` | Integer | Inalterability No Gap Sequence # | False | `` | `` |
| `inalterable_hash` | Char | Inalterability Hash | False | `` | `` |
| `secured` | Boolean |  | False | `_compute_secured` | `` |
| `invoice_line_ids` | One2many | Invoice lines | False | `` | `` |
| `invoice_date` | Date | Invoice/Bill Date | False | `` | `` |
| `invoice_date_due` | Date | Due Date | False | `_compute_invoice_date_due` | `` |
| `delivery_date` | Date | Delivery Date | False | `_compute_delivery_date` | `` |
| `show_delivery_date` | Boolean |  | False | `_compute_show_delivery_date` | `` |
| `taxable_supply_date` | Date | Taxable Supply Date | False | `_compute_taxable_supply_date` | `` |
| `show_taxable_supply_date` | Boolean |  | False | `_compute_show_taxable_supply_date` | `` |
| `taxable_supply_date_placeholder` | Char |  | False | `_compute_taxable_supply_date_placeholder` | `` |
| `invoice_payment_term_id` | Many2one | Payment Terms | False | `_compute_invoice_payment_term_id` | `` |
| `needed_terms` | Binary |  | False | `_compute_needed_terms` | `` |
| `needed_terms_dirty` | Boolean |  | False | `_compute_needed_terms` | `` |
| `tax_calculation_rounding_method` | Selection | Tax calculation rounding method | False | `` | `company_id.tax_calculation_rounding_method` |
| `show_journal` | Boolean |  | False | `_compute_show_journal` | `` |
| `partner_id` | Many2one | Partner | False | `` | `` |
| `commercial_partner_id` | Many2one | Commercial Entity | False | `_compute_commercial_partner_id` | `` |
| `partner_shipping_id` | Many2one | Delivery Address | False | `_compute_partner_shipping_id` | `` |
| `partner_bank_id` | Many2one | Recipient Bank | False | `_compute_partner_bank_id` | `` |
| `fiscal_position_id` | Many2one | Fiscal Position | False | `_compute_fiscal_position_id` | `` |
| `payment_reference` | Char | Payment Reference | False | `_compute_payment_reference` | `` |
| `sanitize_payment_reference` | Char | Label sanitize | False | `_compute_sanitize_payment_reference` | `` |
| `display_qr_code` | Boolean | Display QR-code | False | `_compute_display_qr_code` | `` |
| `display_link_qr_code` | Boolean | Display Link QR-code | False | `_compute_display_link_qr_code` | `` |
| `qr_code_method` | Selection | Payment QR-code | False | `` | `` |
| `invoice_outstanding_credits_debits_widget` | Binary |  | False | `_compute_payments_widget_to_reconcile_info` | `` |
| `invoice_has_outstanding` | Boolean |  | False | `_compute_invoice_has_outstanding` | `` |
| `invoice_payments_widget` | Binary |  | False | `_compute_payments_widget_reconciled_info` | `` |
| `preferred_payment_method_line_id` | Many2one | Preferred Payment Method Line | False | `_compute_preferred_payment_method_line_id` | `` |
| `company_currency_id` | Many2one | Company Currency | False | `` | `company_id.currency_id` |
| `currency_id` | Many2one | Currency | True | `_compute_currency_id` | `` |
| `expected_currency_rate` | Float |  | False | `_compute_expected_currency_rate` | `` |
| `invoice_currency_rate` | Float | Currency Rate | False | `_compute_invoice_currency_rate` | `` |
| `direction_sign` | Integer |  | False | `_compute_direction_sign` | `` |
| `amount_untaxed` | Monetary | Untaxed Amount | False | `_compute_amount` | `` |
| `amount_tax` | Monetary | Tax | False | `_compute_amount` | `` |
| `amount_total` | Monetary | Total | False | `_compute_amount` | `` |
| `amount_residual` | Monetary | Amount Due | False | `_compute_amount` | `` |
| `amount_untaxed_signed` | Monetary | Untaxed Amount Signed | False | `_compute_amount` | `` |
| `amount_untaxed_in_currency_signed` | Monetary | Untaxed Amount Signed Currency | False | `_compute_amount` | `` |
| `amount_tax_signed` | Monetary | Tax Signed | False | `_compute_amount` | `` |
| `amount_total_signed` | Monetary | Total Signed | False | `_compute_amount` | `` |
| `amount_total_in_currency_signed` | Monetary | Total in Currency Signed | False | `_compute_amount` | `` |
| `amount_residual_signed` | Monetary | Amount Due Signed | False | `_compute_amount` | `` |
| `tax_totals` | Binary | Invoice Totals | False | `_compute_tax_totals` | `` |
| `payment_state` | Selection | Payment Status | False | `_compute_payment_state` | `` |
| `status_in_payment` | Selection |  | False | `_compute_status_in_payment` | `` |
| `amount_total_words` | Char | Amount total in words | False | `_compute_amount_total_words` | `` |
| `reversed_entry_id` | Many2one | Reversal of | False | `` | `` |
| `reversal_move_ids` | One2many |  | False | `` | `` |
| `invoice_vendor_bill_id` | Many2one | Vendor Bill | False | `` | `` |
| `invoice_source_email` | Char | Source Email | False | `` | `` |
| `invoice_partner_display_name` | Char |  | False | `_compute_invoice_partner_display_info` | `` |
| `is_manually_modified` | Boolean |  | False | `` | `` |
| `quick_edit_mode` | Boolean |  | False | `_compute_quick_edit_mode` | `` |
| `quick_edit_total_amount` | Monetary | Total (Tax inc.) | False | `` | `` |
| `quick_encoding_vals` | Json |  | False | `_compute_quick_encoding_vals` | `` |
| `narration` | Html | Terms and Conditions | False | `_compute_narration` | `` |
| `is_move_sent` | Boolean |  | False | `` | `` |
| `is_being_sent` | Boolean |  | False | `_compute_is_being_sent` | `` |
| `move_sent_values` | Selection | Sent | False | `compute_move_sent_values` | `` |
| `invoice_user_id` | Many2one | Salesperson | False | `_compute_invoice_default_sale_person` | `` |
| `user_id` | Many2one | User | False | `` | `invoice_user_id` |
| `invoice_origin` | Char | Origin | False | `` | `` |
| `invoice_incoterm_id` | Many2one | Incoterm | False | `_compute_incoterm` | `` |
| `incoterm_location` | Char | Incoterm Location | False | `_compute_incoterm_location` | `` |
| `invoice_cash_rounding_id` | Many2one | Cash Rounding Method | False | `` | `` |
| `sending_data` | Json |  | False | `` | `` |
| `invoice_pdf_report_id` | Many2one | PDF Attachment | False | `` | `` |
| `invoice_pdf_report_file` | Binary | PDF File | False | `` | `` |
| `invoice_incoterm_placeholder` | Char |  | False | `_compute_invoice_incoterm_placeholder` | `` |
| `invoice_filter_type_domain` | Char |  | False | `_compute_invoice_filter_type_domain` | `` |
| `bank_partner_id` | Many2one |  | False | `_compute_bank_partner_id` | `` |
| `tax_lock_date_message` | Char |  | False | `_compute_tax_lock_date_message` | `` |
| `display_inactive_currency_warning` | Boolean |  | False | `_compute_display_inactive_currency_warning` | `` |
| `tax_country_id` | Many2one |  | False | `_compute_tax_country_id` | `` |
| `tax_country_code` | Char |  | False | `_compute_tax_country_code` | `` |
| `has_reconciled_entries` | Boolean |  | False | `_compute_has_reconciled_entries` | `` |
| `show_reset_to_draft_button` | Boolean |  | False | `_compute_show_reset_to_draft_button` | `` |
| `partner_credit_warning` | Text |  | False | `_compute_partner_credit_warning` | `` |
| `duplicated_ref_ids` | Many2many |  | False | `_compute_duplicated_ref_ids` | `` |
| `is_draft_duplicated_ref_ids` | Boolean |  | False | `_compute_is_draft_duplicated_ref_ids` | `` |
| `is_exact_move_duplicate` | Boolean |  | False | `_compute_is_draft_duplicated_ref_ids` | `` |
| `need_cancel_request` | Boolean |  | False | `_compute_need_cancel_request` | `` |
| `show_update_fpos` | Boolean | Has Fiscal Position Changed | False | `` | `` |
| `payment_term_details` | Binary |  | False | `_compute_payment_term_details` | `` |
| `show_payment_term_details` | Boolean |  | False | `_compute_show_payment_term_details` | `` |
| `show_discount_details` | Boolean |  | False | `_compute_show_payment_term_details` | `` |
| `abnormal_amount_warning` | Text |  | False | `_compute_abnormal_warnings` | `` |
| `abnormal_date_warning` | Text |  | False | `_compute_abnormal_warnings` | `` |
| `alerts` | Json |  | False | `_compute_alerts` | `` |
| `taxes_legal_notes` | Html | Taxes Legal Notes | False | `_compute_taxes_legal_notes` | `` |
| `next_payment_date` | Date | Next Payment Date | False | `_compute_next_payment_date` | `` |
| `display_send_button` | Boolean |  | False | `_compute_display_send_button` | `` |
| `highlight_send_button` | Boolean |  | False | `_compute_highlight_send_button` | `` |
| `is_sale_installed` | Boolean |  | False | `_compute_is_sale_installed` | `` |

## Relationships
- Relational dependencies are mapped via `Many2one`, `One2many`, and `Many2many` fields in the table above.
- Cascade deletions and database-level foreign keys are enforced by PostgreSQL according to Odoo ORM registry rules.

## Validation & Business Rules
- **Python Constraints**: Defined via `@api.constrains` in the python source file.
- **SQL Constraints**: Defined via `_sql_constraints` in the model definition.
- **Null Enforcements**: Fields where `Required?` is `True` are validated at transaction commit.

## Traceability
- **Source Module**: `account`
- **Model Path**: `addons/account/models/account_move.py`
- **Confidence**: HIGH
