# Plane — Architectural Patterns

Source: Plane Documentation and Django model structure (GitHub: makeplane/plane dev branch)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Separate State Categories vs. Status Names

Source: `apiserver/plane/db/models/state.py`
Pattern: A Status belongs to a strict system "State Category" (Backlog, Unstarted, Started, Completed, Cancelled). Users can define custom status names (e.g. "QA Verification"), but it must map to one of the system categories.
Problem solved: Ensures the system can compute progress metrics (like "started" or "done") uniformly across different projects, regardless of custom status naming.
Applicability to Verity: HIGH — Verity should use fixed operational categories (e.g. IN_PROGRESS, COMPLETED) to drive SLA timers, while letting clients name the specific steps (e.g. "Tech on Site").

---

### Delta-based Activity Feeds

Source: `IssueActivity` Model
Pattern: Recording individual field changes as structured rows (`verb`, `field`, `old_value`, `new_value`) rather than just raw text comments.
Problem solved: Allows rendering interactive timeline feeds (e.g. "John updated Priority from Low to High") and generates clean change metrics.
Applicability to Verity: HIGH — Important for debugging technician work order modifications.
