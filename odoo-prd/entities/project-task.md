# Entity: Project Task (project.task)

## Purpose
Exhaustive functional and schema specification of the `project.task` entity.

## Fields Inventory
The following table lists every field declared in the source code file:

| Field Name | Type | String Label | Required? | Compute Method | Related Path |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `active` | Boolean |  | False | `` | `` |
| `name` | Char | Title | True | `` | `` |
| `description` | Html | Description | False | `` | `` |
| `priority` | Selection | Priority | False | `` | `` |
| `sequence` | Integer | Sequence | False | `` | `` |
| `stage_id` | Many2one | Stage | False | `_compute_stage_id` | `` |
| `stage_id_color` | Integer | Stage Color | False | `` | `stage_id.color` |
| `tag_ids` | Many2many | Tags | False | `` | `` |
| `state` | Selection | State | True | `_compute_state` | `` |
| `is_closed` | Boolean |  | False | `_compute_is_closed` | `` |
| `create_date` | Datetime |  | False | `` | `` |
| `write_date` | Datetime |  | False | `` | `` |
| `date_end` | Datetime | Ending Date | False | `` | `` |
| `date_assign` | Datetime | Assigning Date | False | `` | `` |
| `date_deadline` | Datetime | Deadline | False | `` | `` |
| `date_last_stage_update` | Datetime | Last Stage Update | False | `` | `` |
| `project_id` | Many2one | Project | False | `_compute_project_id` | `` |
| `display_in_project` | Boolean |  | False | `_compute_display_in_project` | `` |
| `task_properties` | Properties |  | False | `` | `` |
| `allocated_hours` | Float |  | False | `` | `` |
| `subtask_allocated_hours` | Float |  | False | `_compute_subtask_allocated_hours` | `` |
| `role_ids` | Many2many | Project Roles | False | `` | `` |
| `user_ids` | Many2many | Assignees | False | `` | `` |
| `portal_user_names` | Char |  | False | `_compute_portal_user_names` | `` |
| `personal_stage_type_ids` | Many2many | Personal Stages | False | `` | `` |
| `personal_stage_id` | Many2one | Personal Stage State | False | `_compute_personal_stage_id` | `` |
| `personal_stage_type_id` | Many2one | Personal Stage | False | `` | `personal_stage_id.stage_id` |
| `partner_id` | Many2one | Customer | False | `_compute_partner_id` | `` |
| `partner_phone` | Char | Contact Number | False | `_compute_partner_phone` | `` |
| `email_from` | Char |  | False | `` | `` |
| `email_cc` | Char |  | False | `` | `` |
| `company_id` | Many2one | Company | False | `_compute_company_id` | `` |
| `color` | Integer | Color Index | False | `` | `` |
| `rating_active` | Boolean | Stage Rating Status | False | `` | `stage_id.rating_active` |
| `attachment_ids` | One2many | Attachments | False | `_compute_attachment_ids` | `` |
| `displayed_image_id` | Many2one | Cover Image | False | `` | `` |
| `parent_id` | Many2one | Parent Task | False | `` | `` |
| `child_ids` | One2many | Sub-tasks | False | `` | `` |
| `subtask_count` | Integer |  | False | `_compute_subtask_count` | `` |
| `closed_subtask_count` | Integer |  | False | `_compute_subtask_count` | `` |
| `project_privacy_visibility` | Selection | Project Visibility | False | `` | `project_id.privacy_visibility` |
| `subtask_completion_percentage` | Float |  | False | `_compute_subtask_completion_percentage` | `` |
| `working_hours_open` | Float | Working Hours to Assign | False | `_compute_elapsed` | `` |
| `working_hours_close` | Float | Working Hours to Close | False | `_compute_elapsed` | `` |
| `working_days_open` | Float | Working Days to Assign | False | `_compute_elapsed` | `` |
| `working_days_close` | Float | Working Days to Close | False | `_compute_elapsed` | `` |
| `website_message_ids` | One2many |  | False | `` | `` |
| `allow_milestones` | Boolean |  | False | `` | `project_id.allow_milestones` |
| `milestone_id` | Many2one |  | False | `_compute_milestone_id` | `` |
| `has_late_and_unreached_milestone` | Boolean |  | False | `_compute_has_late_and_unreached_milestone` | `` |
| `allow_task_dependencies` | Boolean |  | False | `` | `project_id.allow_task_dependencies` |
| `depend_on_ids` | Many2many | Blocked By | False | `` | `` |
| `depend_on_count` | Integer | Depending on Tasks | False | `_compute_depend_on_count` | `` |
| `closed_depend_on_count` | Integer | Closed Depending on Tasks | False | `_compute_depend_on_count` | `` |
| `dependent_ids` | Many2many | Block | False | `` | `` |
| `dependent_tasks_count` | Integer | Dependent Tasks | False | `_compute_dependent_tasks_count` | `` |
| `display_parent_task_button` | Boolean |  | False | `_compute_display_parent_task_button` | `` |
| `current_user_same_company_partner` | Boolean |  | False | `_compute_current_user_same_company_partner` | `` |
| `display_follow_button` | Boolean |  | False | `_compute_display_follow_button` | `` |
| `allow_recurring_tasks` | Boolean |  | False | `` | `project_id.allow_recurring_tasks` |
| `recurring_task` | Boolean | Recurrent | False | `` | `` |
| `recurring_count` | Integer | Tasks in Recurrence | False | `_compute_recurring_count` | `` |
| `recurrence_id` | Many2one |  | False | `` | `` |
| `repeat_interval` | Integer | Repeat Every | False | `_compute_repeat` | `` |
| `repeat_unit` | Selection |  | False | `_compute_repeat` | `` |
| `repeat_type` | Selection | Until | False | `_compute_repeat` | `` |
| `repeat_until` | Date | End Date | False | `_compute_repeat` | `` |
| `display_name` | Char |  | False | `` | `` |
| `link_preview_name` | Char |  | False | `_compute_link_preview_name` | `` |
| `is_template` | Boolean |  | False | `` | `` |
| `has_project_template` | Boolean | Has Project Template | False | `` | `project_id.is_template` |
| `has_template_ancestor` | Boolean |  | False | `_compute_has_template_ancestor` | `` |

## Relationships
- Relational dependencies are mapped via `Many2one`, `One2many`, and `Many2many` fields in the table above.
- Cascade deletions and database-level foreign keys are enforced by PostgreSQL according to Odoo ORM registry rules.

## Validation & Business Rules
- **Python Constraints**: Defined via `@api.constrains` in the python source file.
- **SQL Constraints**: Defined via `_sql_constraints` in the model definition.
- **Null Enforcements**: Fields where `Required?` is `True` are validated at transaction commit.

## Traceability
- **Source Module**: `project`
- **Model Path**: `addons/project/models/project_task.py`
- **Confidence**: HIGH
