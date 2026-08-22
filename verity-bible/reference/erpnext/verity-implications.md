# ERPNext — Verity Implications

Source: erpnext/projects/doctype/, erpnext/maintenance/doctype/
Date: 2026-08-22

---

### Two-Phase Recurring Work Order Generation

Confidence: HIGH
Recommendation: ADOPT
Rationale: ERPNext's Maintenance Schedule (`maintenance_schedule.json`) separates PERIODICITY RULES from GENERATED INSTANCES. This is the correct model for Verity's recurring preventive maintenance work orders. Do not create all future instances at setup; compute and create on a rolling horizon.
If ADOPT: Verity's RecurringSchedule entity stores periodicity rules (frequency, day-of-week, lead time). A background job generates concrete WorkOrders N days before their due date. Cancellation of the rule stops future generation; existing WorkOrders stand.
Affects Bible sections: Volume III (Recurring work orders), Volume VI (Scheduling capability)

---

### Configurable Completion Method (Progress Policy)

Confidence: HIGH
Recommendation: ADOPT
Rationale: ERPNext's `percent_complete_method` field (project.json) makes progress computation a configurable policy. This applies directly to Verity: different work order types may calculate "done-ness" differently (all tasks complete vs. weighted task progress vs. manual override).
If ADOPT: WorkOrder entity has a `completionMethod` field: MANUAL | ALL_TASKS | WEIGHTED_TASKS | EVIDENCE_BASED. The state machine uses the configured method to determine if the transition to "Completed" is permitted.
Affects Bible sections: Volume III (State machine), Volume II (Work primitive)

---

### Territory as Operational Scope

Confidence: HIGH
Recommendation: ADOPT
Rationale: ERPNext's Territory field on Maintenance Schedule links customer operations to geographic regions. Verity needs an equivalent to scope resource pools, work order assignment, and reporting.
If ADOPT: Verity implements a Territory entity (region/zone/district hierarchy). Work orders, customers, and resource assignments all carry a Territory FK. Reports and permissions are territory-filtered.
Affects Bible sections: Volume II (Party/Location model), Volume III (Assignment rules)

---

### Task Status State Machine

Confidence: HIGH
Recommendation: ADOPT
Rationale: ERPNext's Task has 7 statuses (Open | Working | Pending Review | Overdue | Template | Completed | Cancelled), which is more complete than a simple open/closed toggle. The `Pending Review` state is particularly important — it models human approval steps in a checklist.
If ADOPT: Verity's work order task (checklist item) has at minimum: NOT_STARTED | IN_PROGRESS | PENDING_REVIEW | COMPLETED | BLOCKED | SKIPPED.
Affects Bible sections: Volume III (Task state machine)
