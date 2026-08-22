# Plane — Concept Inventory

Source: Plane Documentation and Django model structure (GitHub: makeplane/plane dev branch)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Issue (Task)

Source: `apiserver/plane/db/models/issue.py`
Definition: The core trackable work unit (bug, feature request, task, sub-task).
Key attributes:
- `name` (String)
- `description` (JSON/RichText)
- `priority` (Select: urgent | high | medium | low | none)
- `state` (Link: State - Backlog, Unstarted, Started, Completed, Cancelled)
- `project` (Link: Project)
- `parent` (Self-referential FK for sub-tasks)
- `assignees` (Many-to-Many with User)
Notes for Verity: Plane separates the generic workflow `state` (group category) from the specific customized status name.

---

### Cycle

Source: `apiserver/plane/db/models/cycle.py`
Definition: A time-bound sprint or iteration of work with a fixed start and end date.
Purpose: Grouping tasks for a specific time range to measure velocity.
Key attributes: `start_date`, `end_date`, `project`.

---

### Module

Source: `apiserver/plane/db/models/module.py`
Definition: A logical grouping of issues centered around a feature area or project component (analogous to an Epic).
Purpose: Tracking progress on a feature independent of time-boxed cycles.

---

### IssueActivity (Audit Log)

Source: `apiserver/plane/db/models/issue.py` (IssueActivity model)
Definition: Log of changes made to an Issue, recording who modified what fields, comments added, or status transitions.
Key attributes: `actor`, `verb`, `field`, `old_value`, `new_value`.
Notes for Verity: Crucial pattern for historic task tracking.
