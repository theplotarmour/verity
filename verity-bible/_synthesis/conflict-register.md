# Conflict Register

This register identifies key architectural conflicts between the reference systems, defining how Verity resolves them.

---

### Conflict 1: Runtime Dynamic Meta-model (Frappe) vs. Static Type Safety (TypeScript)

* **Reference Systems**: Frappe (DocType metadata stored in DB) vs. Modern TypeScript frameworks (Next.js/Zod).
* **Nature of Conflict**: Frappe allows schema modifications at runtime without code deployment, but loses IDE autocompletion, static type safety, and standard compilation compile checks.
* **Verity Resolution**: **ADAPT**. Define the core canonical schema strictly in TypeScript code using Zod/Prisma. Implement tenant customizations by attaching a metadata-driven JSONB column (`extensions`) to entities, avoiding schema migrations while preserving compile-time verification for the core model.

---

### Conflict 2: Active-Record Mutation (Odoo/Frappe) vs. Event-Sourced Durability (Temporal/ActivityWatch)

* **Reference Systems**: Odoo/Frappe (direct row updates via ORM) vs. Temporal/ActivityWatch (rebuilding state by replaying an immutable event log).
* **Nature of Conflict**: Event-sourcing provides perfect audit trails but introduces high storage overhead and query complexity. Active-record updates are fast and simple but prone to audit decay and race conditions on concurrent updates.
* **Verity Resolution**: **ADAPT**. The core state of a Work Order is stored as a standard relational row (Active-Record style) for fast scheduling and querying. However, all status transitions and field modifications are backed by an append-only `WorkOrderEvent` log. SLA breach calculations read the event log directly, ensuring audits remain immutable.

---

### Conflict 3: Realm Isolation (Keycloak) vs. Shared Identity across Organizations

* **Reference Systems**: Keycloak (Realms as strict, non-intersecting security domains) vs. CRM/ERP models (User can act in different roles across multiple client organizations).
* **Nature of Conflict**: Realm-level isolation prevents a user from logging into Tenant B with their Tenant A session. However, in field services, a contractor might perform work for both Customer A and Customer B, requiring a single identity with separate role/group bindings.
* **Verity Resolution**: **ADAPT**. Verity uses a single tenant realm for authentication. Organizations within the realm are modeled as groups/organizations. Tenant isolation is strictly enforced at the database level by injecting a `tenant_id` filter into all query middleware.

---

### Conflict 4: Automated Successor Rescheduling (OpenProject) vs. Operational Schedule Stability

* **Reference Systems**: OpenProject (automatically shifting successor dates when predecessor slips) vs. Field Service realities.
* **Nature of Conflict**: Shifting a predecessor task automatically in a project plan works for software development, but in field service, moving a morning job automatically shifts an afternoon job at a different site, causing routing conflicts.
* **Verity Resolution**: **REJECT**. Verity rejects auto-shifting dates. If a predecessor job is delayed, the system flags a schedule conflict and issues an alert to the dispatcher but leaves dates unchanged until manual intervention.
