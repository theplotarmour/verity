# ERPNext — Architectural Patterns

Source: erpnext/projects/doctype/, erpnext/maintenance/doctype/
Date: 2026-08-22

---

### Two-Phase Recurrence: Periodicity Definition → Instance Generation

Source evidence: `maintenance_schedule.json` — `schedule` (periodicity rules) vs. `schedules` (generated instances)
Pattern: Recurring service plans are defined as periodicity rules, then a separate explicit action generates the concrete scheduled instances.
Problem solved: Avoids pre-creating thousands of future records at setup; allows rules to change before instances are generated.
Implementation sketch: `MaintenanceSchedule` has a `schedule` child table (periodicity + date range per item) and a `generate_schedule` action that populates the `schedules` child table.
Trade-offs: User must explicitly generate (or a job must auto-generate) future instances ahead of their due date.
Applicability to Verity: HIGH — Verity's recurring work orders (weekly safety checks, monthly PM) should store periodicity as a rule and generate actual Work Orders on a rolling horizon (e.g., generate 30 days ahead, cron-triggered).

---

### Business Domain on Top of Framework

Source evidence: All ERPNext DocType JSONs are plain data, extending Frappe's platform.
Pattern: ERPNext adds zero framework code — it exclusively adds DocType definitions, reports, and server-side scripts on top of Frappe.
Problem solved: Achieves business domain richness without duplicating platform infrastructure.
Applicability to Verity: HIGH — Verity's "service operations" capabilities should be layered on top of platform capabilities (metamodel, permissions, events), not built from scratch.

---

### Territory-Scoped Customer Operations

Source evidence: `maintenance_schedule.json` — `territory` field (Link: Territory)
Pattern: Customer operations are scoped to a geographical Territory.
Problem solved: Assigns and reports on customer maintenance obligations by region.
Applicability to Verity: MEDIUM — Verity's territory model should be a first-class entity that scopes work orders, resource pools, and reporting.
