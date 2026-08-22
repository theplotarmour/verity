# ERPNext — Behavior Inventory

Source: erpnext/maintenance/doctype/maintenance_schedule/maintenance_schedule.json, projects/doctype/project/project.json
Date: 2026-08-22

---

### Maintenance Schedule Generation

Source evidence: `maintenance_schedule.json` fields: `items`, `schedule`, `schedules`, `generate_schedule` (Button)
Trigger: User clicks "Generate Schedule" button on a Draft Maintenance Schedule.
Preconditions: `items` table has at least one item with a periodicity rule.
Steps:
1. For each item in `items`, read its periodicity (Monthly/Quarterly/etc.) and date range.
2. Generate individual scheduled visits in the `schedules` child table.
3. Each entry in `schedules` has a specific scheduled date.
State changes: `schedules` table populated with N future visit dates.
Side effects: None (no notifications or bookings yet — schedule is a plan).
Failure handling: Validation if date range or periodicity is missing.
Notes for Verity: The two-phase generate pattern — define periodicity → generate individual instances — is the correct model for recurring work orders. Verity should NOT try to solve recurrence by creating all future instances at setup; it should compute the next scheduled instance on demand.

---

### Project Percent Completion Calculation

Source evidence: `project.json` field: `percent_complete_method`
Trigger: A Task within the Project changes status.
Steps:
1. On task status change, recalculate project `percent_complete` based on method:
   - Manual: user updates directly
   - Task Completion: count completed tasks / total tasks
   - Task Progress: average `progress` field across tasks
   - Task Weight: weighted average using task `task_weight`
Notes for Verity: The configurable completion method teaches Verity that SLA/progress tracking is a POLICY, not a fixed formula. Different service types may use different completion computations.

---

### Task Dependency (Blocking)

Source evidence: `task.json` field: `depends_on` (Table: Task Depends On)
Trigger: Attempting to progress a Task that has unresolved dependencies.
Preconditions: Task has entries in `depends_on` child table.
Steps: System checks if upstream Tasks are completed before allowing the current task to begin.
Notes for Verity: A simple blocking dependency on tasks is sufficient for v1. Complex scheduling networks (Gantt) require separate consideration.
