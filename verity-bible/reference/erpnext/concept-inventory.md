# ERPNext — Concept Inventory

Source: erpnext/projects/doctype/project/project.json, task/task.json, maintenance/maintenance_schedule.json
Repository: https://github.com/frappe/erpnext (branch: develop)
Date: 2026-08-22

---

### Project

Source evidence: `erpnext/projects/doctype/project/project.json`
Definition: A collection of related Tasks with a defined expected end date, status, and percentage completion.
Purpose: Planning and tracking multi-task work efforts.
Key fields/attributes:
- `project_name` (Data, required)
- `status` (Select: Open | Completed | Cancelled)
- `expected_start_date`, `expected_end_date` (Date)
- `percent_complete_method` (Select: Manual | Task Completion | Task Progress | Task Weight)
- `customer` (Link: Customer) — project is for a specific client
- `project_type` (Link: Project Type)
- `is_active` (Select: Yes | No)
Notes for Verity: `percent_complete_method` is particularly relevant — it shows that progress computation is a POLICY choice, not hardcoded. Verity's work order progress should be similarly configurable.

---

### Task

Source evidence: `erpnext/projects/doctype/task/task.json`
Definition: A unit of work within a Project.
Purpose: Represents a discrete action to be completed.
Key fields/attributes:
- `subject` (Data, required) — task title
- `project` (Link: Project)
- `status` (Select: Open | Working | Pending Review | Overdue | Template | Completed | Cancelled)
- `type` (Link: Task Type)
- `priority` (Select: Low | Medium | High | Urgent)
- `exp_start_date`, `exp_end_date` (Date)
- `depends_on` (Table: Task Depends On) — blocking dependency
Notes for Verity: Task has both a date-range and a `depends_on` child table. Dependencies + a status state machine are the minimum model for a work checklist item.

---

### Maintenance Schedule

Source evidence: `erpnext/maintenance/doctype/maintenance_schedule/maintenance_schedule.json`
Definition: A customer-linked recurring maintenance plan that generates maintenance visits.
Purpose: Schedule and track recurring maintenance obligations for a customer's equipment.
Key fields/attributes:
- `customer` (Link: Customer)
- `status` (Select: Draft | Submitted | Cancelled)
- `items` (Table) — items/assets to be maintained
- `schedule` (Table) — periodicity, start/end date per item (Monthly/Quarterly/Half Yearly/Yearly/Random)
- `schedules` (Table) — generated individual scheduled visits
- `territory` (Link: Territory) — geographic scope
- `naming_series`: `MAT-MSH-.YYYY.-`
Notes for Verity: The `schedule` → `schedules` two-phase pattern is important: you define the PERIODICITY first (quarterly service), then the system GENERATES individual scheduled visits from it. Verity's recurring work order generation should follow this same two-phase model.

---

### CRM Lead (inferred from module structure)

Source evidence: Module path `erpnext/crm/doctype/lead/`
Definition: An unqualified sales prospect.
Purpose: First entry in the Lead → Opportunity → Customer pipeline.
Notes for Verity: ERPNext's Lead DocType follows the standard CRM pattern. Confirmed existence in module structure but not directly JSON-inspected — marked MEDIUM confidence.
