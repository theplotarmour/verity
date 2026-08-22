# Entity: Partner (res.partner)

## Purpose
Exhaustive functional and schema specification of the `res.partner` entity.

## Fields Inventory
The following table lists every field declared in the source code file:

| Field Name | Type | String Label | Required? | Compute Method | Related Path |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `name` | Char |  | True | `` | `` |
| `color` | Integer | Color | False | `` | `` |
| `active` | Boolean |  | False | `` | `` |
| `parent_path` | Char |  | False | `` | `` |
| `name` | Char |  | False | `` | `` |
| `complete_name` | Char |  | False | `_compute_complete_name` | `` |
| `parent_name` | Char | Parent name | False | `` | `parent_id.name` |
| `ref` | Char | Reference | False | `` | `` |
| `lang` | Selection | Language | False | `_compute_lang` | `` |
| `active_lang_count` | Integer |  | False | `_compute_active_lang_count` | `` |
| `tz` | Selection | Timezone | False | `` | `` |
| `tz_offset` | Char | Timezone offset | False | `_compute_tz_offset` | `` |
| `vat` | Char | Tax ID | False | `` | `` |
| `vat_label` | Char | Tax ID Label | False | `_compute_vat_label` | `` |
| `company_registry` | Char | Company ID | False | `_compute_company_registry` | `` |
| `company_registry_label` | Char | Company ID Label | False | `_compute_company_registry_label` | `` |
| `company_registry_placeholder` | Char |  | False | `_compute_company_registry_placeholder` | `` |
| `website` | Char |  | False | `` | `` |
| `comment` | Html | Notes | False | `` | `` |
| `active` | Boolean |  | False | `` | `` |
| `employee` | Boolean |  | False | `` | `` |
| `function` | Char | Job Position | False | `` | `` |
| `type` | Selection | Address Type | False | `` | `` |
| `type_address_label` | Char |  | False | `_compute_type_address_label` | `` |
| `street` | Char |  | False | `` | `` |
| `street2` | Char |  | False | `` | `` |
| `zip` | Char |  | False | `` | `` |
| `city` | Char |  | False | `` | `` |
| `country_code` | Char | Country Code | False | `` | `country_id.code` |
| `partner_latitude` | Float | Geo Latitude | False | `` | `` |
| `partner_longitude` | Float | Geo Longitude | False | `` | `` |
| `email` | Char |  | False | `` | `` |
| `email_formatted` | Char |  | False | `_compute_email_formatted` | `` |
| `phone` | Char |  | False | `` | `` |
| `is_company` | Boolean | Is a Company | False | `` | `` |
| `is_public` | Boolean |  | False | `_compute_is_public` | `` |
| `company_type` | Selection | Company Type | False | `_compute_company_type` | `` |
| `color` | Integer | Color Index | False | `` | `` |
| `partner_share` | Boolean |  | False | `_compute_partner_share` | `` |
| `contact_address` | Char | Complete Address | False | `_compute_contact_address` | `` |
| `commercial_company_name` | Char |  | False | `_compute_commercial_company_name` | `` |
| `company_name` | Char |  | False | `` | `` |
| `barcode` | Char |  | False | `` | `` |
| `application_statistics` | Json | Stats | False | `_compute_application_statistics` | `` |
| `name` | Char |  | False | `` | `` |
| `full_name` | Char |  | False | `` | `` |
| `active` | Boolean |  | False | `` | `` |

## Relationships
- Relational dependencies are mapped via `Many2one`, `One2many`, and `Many2many` fields in the table above.
- Cascade deletions and database-level foreign keys are enforced by PostgreSQL according to Odoo ORM registry rules.

## Validation & Business Rules
- **Python Constraints**: Defined via `@api.constrains` in the python source file.
- **SQL Constraints**: Defined via `_sql_constraints` in the model definition.
- **Null Enforcements**: Fields where `Required?` is `True` are validated at transaction commit.

## Traceability
- **Source Module**: `base`
- **Model Path**: `odoo/addons/base/models/res_partner.py`
- **Confidence**: HIGH
