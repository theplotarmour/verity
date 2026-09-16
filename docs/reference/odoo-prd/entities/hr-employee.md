# Entity: Employee (hr.employee)

## Purpose
Exhaustive functional and schema specification of the `hr.employee` entity.

## Fields Inventory
The following table lists every field declared in the source code file:

| Field Name | Type | String Label | Required? | Compute Method | Related Path |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `version_id` | Many2one |  | True | `_compute_version_id` | `` |
| `current_version_id` | Many2one |  | False | `_compute_current_version_id` | `` |
| `current_date_version` | Date | Current Date Version | False | `` | `current_version_id.date_version` |
| `version_ids` | One2many | Employee Versions | True | `` | `` |
| `versions_count` | Integer |  | False | `_compute_versions_count` | `` |
| `version_revision` | Char |  | False | `_compute_version_revision` | `` |
| `name` | Char | Employee Name | False | `` | `resource_id.name` |
| `resource_id` | Many2one |  | True | `` | `` |
| `resource_calendar_id` | Many2one |  | False | `` | `version_id.resource_calendar_id` |
| `user_id` | Many2one |  | False | `` | `resource_id.user_id` |
| `user_partner_id` | Many2one | User's partner | False | `` | `user_id.partner_id` |
| `share` | Boolean |  | False | `` | `user_id.share` |
| `phone` | Char |  | False | `` | `user_id.phone` |
| `im_status` | Char |  | False | `` | `user_id.im_status` |
| `email` | Char |  | False | `` | `user_id.email` |
| `hr_presence_state` | Selection |  | False | `_compute_presence_state` | `` |
| `last_activity` | Date |  | False | `_compute_last_activity` | `` |
| `last_activity_time` | Char |  | False | `_compute_last_activity` | `` |
| `hr_icon_display` | Selection |  | False | `_compute_presence_icon` | `` |
| `show_hr_icon_display` | Boolean |  | False | `_compute_presence_icon` | `` |
| `newly_hired` | Boolean |  | False | `_compute_newly_hired` | `` |
| `active` | Boolean |  | False | `` | `resource_id.active` |
| `company_id` | Many2one |  | True | `` | `` |
| `company_country_id` | Many2one |  | False | `` | `company_id.country_id` |
| `company_country_code` | Char | Company Country Code | False | `` | `company_country_id.code` |
| `work_phone` | Char |  | False | `_compute_work_contact_details` | `` |
| `mobile_phone` | Char |  | False | `` | `` |
| `work_email` | Char |  | False | `_compute_work_contact_details` | `` |
| `work_contact_id` | Many2one |  | False | `` | `` |
| `legal_name` | Char |  | False | `_compute_legal_name` | `` |
| `is_user_active` | Boolean | User's active | False | `` | `user_id.active` |
| `private_phone` | Char | Private Phone | False | `` | `` |
| `private_email` | Char | Private Email | False | `` | `` |
| `lang` | Selection | Lang | False | `` | `` |
| `place_of_birth` | Char |  | False | `` | `` |
| `country_of_birth` | Many2one | Country of Birth | False | `` | `` |
| `birthday` | Date |  | False | `` | `` |
| `birthday_public_display` | Boolean |  | False | `` | `` |
| `birthday_public_display_string` | Char |  | False | `_compute_birthday_public_display_string` | `` |
| `bank_account_ids` | Many2many | Bank Accounts | False | `` | `` |
| `is_trusted_bank_account` | Boolean |  | False | `_compute_is_trusted_bank_account` | `` |
| `primary_bank_account_id` | Many2one |  | False | `_compute_primary_bank_account_id` | `` |
| `has_multiple_bank_accounts` | Boolean |  | False | `_compute_has_multiple_bank_accounts` | `` |
| `salary_distribution` | Json | Salary Distribution | False | `_sync_salary_distribution` | `` |
| `permit_no` | Char |  | False | `` | `` |
| `visa_no` | Char |  | False | `` | `` |
| `visa_expire` | Date |  | False | `` | `` |
| `work_permit_expiration_date` | Date |  | False | `` | `` |
| `has_work_permit` | Binary | Work Permit | False | `` | `` |
| `work_permit_scheduled_activity` | Boolean |  | False | `` | `` |
| `work_permit_name` | Char |  | False | `_compute_work_permit_name` | `` |
| `certificate` | Selection | Certificate Level | False | `` | `` |
| `study_field` | Char |  | False | `` | `` |
| `study_school` | Char |  | False | `` | `` |
| `emergency_contact` | Char |  | False | `` | `` |
| `emergency_phone` | Char |  | False | `` | `` |
| `work_location_name` | Char |  | False | `_compute_work_location_name` | `` |
| `work_location_type` | Selection |  | False | `_compute_work_location_type` | `` |
| `contract_date_start` | Date |  | False | `` | `version_id.contract_date_start` |
| `contract_date_end` | Date |  | False | `` | `version_id.contract_date_end` |
| `trial_date_end` | Date |  | False | `` | `version_id.trial_date_end` |
| `contract_wage` | Monetary |  | False | `` | `version_id.contract_wage` |
| `date_start` | Date |  | False | `` | `version_id.date_start` |
| `date_end` | Date |  | False | `` | `version_id.date_end` |
| `is_current` | Boolean |  | False | `` | `version_id.is_current` |
| `is_past` | Boolean |  | False | `` | `version_id.is_past` |
| `is_future` | Boolean |  | False | `` | `version_id.is_future` |
| `is_in_contract` | Boolean |  | False | `` | `version_id.is_in_contract` |
| `structure_type_id` | Many2one |  | False | `` | `version_id.structure_type_id` |
| `contract_type_id` | Many2one |  | False | `` | `version_id.contract_type_id` |
| `parent_id` | Many2one |  | False | `` | `` |
| `child_ids` | One2many | Direct subordinates | False | `` | `` |
| `coach_id` | Many2one |  | False | `_compute_coach` | `` |
| `category_ids` | Many2many | Tags | False | `` | `` |
| `tz` | Selection |  | False | `` | `` |
| `color` | Integer |  | False | `` | `` |
| `barcode` | Char | Badge ID | False | `` | `` |
| `pin` | Char | PIN | False | `` | `` |
| `message_main_attachment_id` | Many2one |  | False | `` | `` |
| `id_card` | Binary | ID Card Copy | False | `` | `` |
| `driving_license` | Binary | Driving License | False | `` | `` |
| `private_car_plate` | Char |  | False | `` | `` |
| `currency_id` | Many2one |  | False | `` | `company_id.currency_id` |
| `related_partners_count` | Integer |  | False | `_compute_related_partners_count` | `` |
| `employee_properties` | Properties |  | False | `` | `` |
| `activity_ids` | One2many |  | False | `` | `` |
| `activity_state` | Selection |  | False | `` | `` |
| `activity_user_id` | Many2one |  | False | `` | `` |
| `activity_type_id` | Many2one |  | False | `` | `` |
| `activity_type_icon` | Char |  | False | `` | `` |
| `activity_date_deadline` | Date |  | False | `` | `` |
| `my_activity_date_deadline` | Date |  | False | `` | `` |
| `activity_summary` | Char |  | False | `` | `` |
| `activity_exception_decoration` | Selection |  | False | `` | `` |
| `activity_exception_icon` | Char |  | False | `` | `` |
| `message_is_follower` | Boolean |  | False | `` | `` |
| `message_follower_ids` | One2many |  | False | `` | `` |
| `message_partner_ids` | Many2many |  | False | `` | `` |
| `message_ids` | One2many |  | False | `` | `` |
| `has_message` | Boolean |  | False | `` | `` |
| `message_needaction` | Boolean |  | False | `` | `` |
| `message_needaction_counter` | Integer |  | False | `` | `` |
| `message_has_error` | Boolean |  | False | `` | `` |
| `message_has_error_counter` | Integer |  | False | `` | `` |
| `message_attachment_count` | Integer |  | False | `` | `` |

## Relationships
- Relational dependencies are mapped via `Many2one`, `One2many`, and `Many2many` fields in the table above.
- Cascade deletions and database-level foreign keys are enforced by PostgreSQL according to Odoo ORM registry rules.

## Validation & Business Rules
- **Python Constraints**: Defined via `@api.constrains` in the python source file.
- **SQL Constraints**: Defined via `_sql_constraints` in the model definition.
- **Null Enforcements**: Fields where `Required?` is `True` are validated at transaction commit.

## Traceability
- **Source Module**: `hr`
- **Model Path**: `addons/hr/models/hr_employee.py`
- **Confidence**: HIGH
