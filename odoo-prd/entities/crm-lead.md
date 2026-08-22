# Entity: Lead / Opportunity (crm.lead)

## Purpose
Exhaustive functional and schema specification of the `crm.lead` entity.

## Fields Inventory
The following table lists every field declared in the source code file:

| Field Name | Type | String Label | Required? | Compute Method | Related Path |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `name` | Char |  | True | `_compute_name` | `` |
| `user_id` | Many2one | Salesperson | False | `` | `` |
| `user_company_ids` | Many2many |  | False | `_compute_user_company_ids` | `` |
| `team_id` | Many2one | Sales Team | False | `_compute_team_id` | `` |
| `lead_properties` | Properties |  | False | `` | `` |
| `company_id` | Many2one | Company | False | `_compute_company_id` | `` |
| `referred` | Char |  | False | `` | `` |
| `description` | Html |  | False | `` | `` |
| `active` | Boolean |  | False | `` | `` |
| `type` | Selection |  | True | `` | `` |
| `priority` | Selection | Priority | False | `` | `` |
| `stage_id` | Many2one | Stage | False | `_compute_stage_id` | `` |
| `stage_id_color` | Integer | Stage Color | False | `` | `stage_id.color` |
| `tag_ids` | Many2many | Tags | False | `` | `` |
| `color` | Integer |  | False | `` | `` |
| `expected_revenue` | Monetary |  | False | `` | `` |
| `prorated_revenue` | Monetary |  | False | `_compute_prorated_revenue` | `` |
| `recurring_revenue` | Monetary |  | False | `` | `` |
| `recurring_plan` | Many2one | Recurring Plan | False | `` | `` |
| `recurring_revenue_monthly` | Monetary |  | False | `_compute_recurring_revenue_monthly` | `` |
| `recurring_revenue_monthly_prorated` | Monetary |  | False | `_compute_recurring_revenue_monthly_prorated` | `` |
| `recurring_revenue_prorated` | Monetary |  | False | `_compute_recurring_revenue_prorated` | `` |
| `company_currency` | Many2one | Currency | False | `_compute_company_currency` | `` |
| `date_closed` | Datetime |  | False | `` | `` |
| `date_automation_last` | Datetime |  | False | `` | `` |
| `date_open` | Datetime |  | False | `_compute_date_open` | `` |
| `day_open` | Float |  | False | `_compute_day_open` | `` |
| `day_close` | Float |  | False | `_compute_day_close` | `` |
| `date_last_stage_update` | Datetime |  | False | `_compute_date_last_stage_update` | `` |
| `date_conversion` | Datetime |  | False | `` | `` |
| `date_deadline` | Date |  | False | `` | `` |
| `commercial_partner_id` | Many2one | Customer Company | False | `_compute_commercial_partner_id` | `` |
| `partner_id` | Many2one | Contact | False | `` | `` |
| `partner_is_blacklisted` | Boolean |  | False | `` | `partner_id.is_blacklisted` |
| `contact_name` | Char |  | False | `_compute_contact_name` | `` |
| `partner_name` | Char |  | False | `_compute_partner_name` | `` |
| `function` | Char |  | False | `_compute_function` | `` |
| `email_from` | Char |  | False | `_compute_email_from` | `` |
| `email_normalized` | Char |  | False | `` | `` |
| `email_domain_criterion` | Char | Email Domain Criterion | False | `_compute_email_domain_criterion` | `` |
| `phone` | Char |  | False | `_compute_phone` | `` |
| `phone_sanitized` | Char |  | False | `` | `` |
| `phone_state` | Selection | Phone Quality | False | `_compute_phone_state` | `` |
| `email_state` | Selection | Email Quality | False | `_compute_email_state` | `` |
| `website` | Char |  | False | `_compute_website` | `` |
| `lang_id` | Many2one | Language | False | `_compute_lang_id` | `` |
| `lang_code` | Char |  | False | `` | `lang_id.code` |
| `lang_active_count` | Integer |  | False | `_compute_lang_active_count` | `` |
| `street` | Char |  | False | `_compute_partner_address_values` | `` |
| `street2` | Char |  | False | `_compute_partner_address_values` | `` |
| `zip` | Char |  | False | `_compute_partner_address_values` | `` |
| `city` | Char |  | False | `_compute_partner_address_values` | `` |
| `state_id` | Many2one | State | False | `_compute_partner_address_values` | `` |
| `country_id` | Many2one | Country | False | `_compute_partner_address_values` | `` |
| `probability` | Float |  | False | `_compute_probabilities` | `` |
| `automated_probability` | Float |  | False | `_compute_probabilities` | `` |
| `is_automated_probability` | Boolean |  | False | `_compute_is_automated_probability` | `` |
| `won_status` | Selection | Won/Lost | False | `_compute_won_status` | `` |
| `lost_reason_id` | Many2one | Lost Reason | False | `` | `` |
| `calendar_event_ids` | One2many | Meetings | False | `` | `` |
| `duplicate_lead_ids` | Many2many | Potential Duplicate Lead | False | `_compute_potential_lead_duplicates` | `` |
| `duplicate_lead_count` | Integer | Potential Duplicate Lead Count | False | `_compute_potential_lead_duplicates` | `` |
| `meeting_display_date` | Date |  | False | `_compute_meeting_display` | `` |
| `meeting_display_label` | Char |  | False | `_compute_meeting_display` | `` |
| `partner_email_update` | Boolean |  | False | `_compute_partner_email_update` | `` |
| `partner_phone_update` | Boolean |  | False | `_compute_partner_phone_update` | `` |
| `is_partner_visible` | Boolean |  | False | `_compute_is_partner_visible` | `` |
| `campaign_id` | Many2one |  | False | `` | `` |
| `medium_id` | Many2one |  | False | `` | `` |
| `source_id` | Many2one |  | False | `` | `` |

## Relationships
- Relational dependencies are mapped via `Many2one`, `One2many`, and `Many2many` fields in the table above.
- Cascade deletions and database-level foreign keys are enforced by PostgreSQL according to Odoo ORM registry rules.

## Validation & Business Rules
- **Python Constraints**: Defined via `@api.constrains` in the python source file.
- **SQL Constraints**: Defined via `_sql_constraints` in the model definition.
- **Null Enforcements**: Fields where `Required?` is `True` are validated at transaction commit.

## Traceability
- **Source Module**: `crm`
- **Model Path**: `addons/crm/models/crm_lead.py`
- **Confidence**: HIGH
