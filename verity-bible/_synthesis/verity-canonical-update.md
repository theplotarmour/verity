# Verity Canonical Update

This document updates the canonical platform decisions in the Verity Bible based on the findings from the 18 reference systems.

---

## 1. ADOPTED Decisions

These patterns are adopted directly as defined in the referenced systems:

* **Child Tables (Frappe)**: Nested components like work order tasks, checklist items, and line items are modeled as sub-records owned by the parent document (Aggregate Root). They have no independent API endpoints and are mutated only via the parent record.
  * *Affected Bible sections*: Volume II (Work Primitive), Volume V (Data Architecture)
* **Composite Roles (Keycloak)**: Role inheritance is implemented via self-referential parent/child links on the Role entity, mapping to a flat set of permission flags at runtime.
  * *Affected Bible sections*: Volume V (Authorization)
* **DAG-based Automation (n8n)**: Automations are modeled as Directed Acyclic Graphs (DAGs) of nodes with standardized JSON payloads flowing between them, replacing simple flat event-action triggers.
  * *Affected Bible sections*: Volume III (Execution/Workflow), Volume VI (Automation Capability)
* **Schedules and Shift Templates (Cal.com)**: Worker shifts are managed as reusable named weekly schedules, mapping availability windows in UTC.
  * *Affected Bible sections*: Volume III (Scheduling & Dispatch)

---

## 2. ADAPTED Decisions

These patterns are adapted to fit Verity's architecture constraints:

* **Zod-backed JSONB Metadata (Adapting Frappe's Meta)**: Rather than storing entity schemas dynamically in the database, Verity uses statically typed TypeScript models. Dynamic tenant custom fields are merged at runtime into a structured JSONB `extensions` field validated by dynamic Zod schemas.
  * *Affected Bible sections*: Volume II (Metamodel), Volume VI (Configuration)
* **Event-Sourced SLA Audit Trails (Adapting Temporal/ActivityWatch)**: Instead of full event-sourcing for all queries, Verity uses a hybrid model: current operational states are saved in standard relational rows, but all mutations are recorded in an append-only `WorkOrderEvent` log. SLA timers read the event log directly to verify compliance.
  * *Affected Bible sections*: Volume III (SLA & Clocks), Volume V (Audit)
* **AST-based Analytical Sandboxing (Adapting Metabase)**: Reports and dash boards request data using a structured JSON AST query builder. The query processor intercepts the AST and injects tenant-isolation clauses before SQL generation.
  * *Affected Bible sections*: Volume V (Security), Volume VI (Analytics)

---

## 3. REJECTED Decisions

These reference behaviors are rejected:

* **Automated Schedule Slippage (Rejecting OpenProject)**: Successor work order dates will not automatically shift when a predecessor job is delayed. Auto-shifts introduce geographical conflicts and worker overlap. Instead, flag delays as conflicts and alert dispatchers for manual resolution.
  * *Affected Bible sections*: Volume III (Scheduling & Dispatch)
* **Coarse-grained Authorization (Rejecting flat RBAC)**: Coarse RBAC (e.g. user is "Manager") is rejected. Verity requires row-level visibility filters mapped through user branch/territory associations (adapting Frappe's User Permission scoping).
  * *Affected Bible sections*: Volume V (Authorization)

---

## 4. INVESTIGATION Backlog

Outstanding architectural investigations:

* **Keycloak Tenant Model: Realm vs. Group**: Determine if clients need completely isolated authentication policies (Realm-per-Org) or if user identity must be shared across organizations (Group-as-Org).
* **Sync Conflict Resolution (LWW vs CRDT)**: Investigate the optimal offline-sync merge strategy for checklist entries to prevent data loss.
