# Plane — Verity Implications

Source: Plane Documentation and Django model structure (GitHub: makeplane/plane dev branch)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Core State Categories with Custom Status Overlays

Confidence: HIGH
Recommendation: ADOPT
Rationale: Field service organizations have highly specific status names (e.g. "Arrived at Gate", "Inspecting Compressor"). However, the core scheduling/SLA engine only needs to know basic states: Is the technician traveling? Has work started? Is it done? Decoupling system categories from user statuses solves this.
If ADOPT: Verity defines a fixed enum of `StateCategory` (DRAFT, SCHEDULING, EN_ROUTE, IN_PROGRESS, COMPLETED, CANCELLED). Tenants can create custom `Status` records (e.g., "Awaiting Customer Gate Pass") mapped to a `StateCategory`. SLA timers run based on `StateCategory` changes.
Affects Bible sections: Volume III (State Machine), Volume II (Work Primitive)

---

### Structured Activity Logs for Auditing

Confidence: HIGH
Recommendation: ADOPT
Rationale: Plain-text comments do not support analytical auditing. Storing structured change events (who changed which field from what value to what new value) allows Verity to reconstruct exactly how a Work Order progressed and audit dispatcher changes.
If ADOPT: Verity implements a `WorkOrderActivity` table that records deltas (`field_changed`, `previous_value`, `new_value`, `changed_by_id`, `timestamp`) on every save lifecycle of a Work Order.
Affects Bible sections: Volume V (Audit & Security)
