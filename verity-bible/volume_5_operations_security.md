# VERITY MASTER BIBLE — VOLUME V
## Platform Operations, Data, Security & Tenancy

This volume governs the infrastructure and operations of the Verity platform: multi-tenancy isolation rules, data integrity constraints, API integrations, observability targets, versioning, and our stance on Artificial Intelligence.

---

## 1. Security & Tenancy Architecture
Verity operates on a strict multi-tenant architecture. Data leaks between Organizations are catastrophic failures.

### A. Tenancy Isolation
1.  **Logical RLS Partitioning:** Every query executed by the server must be scoped by the tenant's `organizationId` (for corporate entities) or `factoryId` (for specific sites/outlets).
2.  **Cross-Tenant Guardrails:** Database operations must use Row-Level Security (RLS) policies at the PostgreSQL engine level, or enforce tenancy checks within the database driver middleware. Tenant context is derived strictly from the authenticated session, never from user-supplied query parameters.
3.  **Cross-Tenant Relationships:** It is strictly forbidden for any entity in tenant $A$ to reference a foreign key in tenant $B$. Shared systems (like global product templates) must use cross-tenant mappings that copy configuration rather than sharing direct entity rows.

### B. Least Privilege Access (Security Constitution)
*   **Role-Based Access Control (RBAC):** Permissions are explicit. Actions reject execution by default unless the principal's session carries a Role that explicitly grants permission for that specific Entity action.
*   **Administrative Isolation:** Platform operators (Verity HQ support staff) have separate credentials and audit streams from Tenant Administrators. A platform operator can only access tenant data through an explicit, time-locked "Impersonation Ticket" authorized by the tenant.

---

## 2. Data Philosophy
*   **Single Source of Truth:** A domain object exists in exactly one canonical table. A customer is a `Party` (role = CUSTOMER); their billing info, service history, and support tickets reference this single `Party` record. We do not maintain separate tables like `CrmCustomer`, `BillingClient`, and `BookingUser`.
*   **Separation of Data and Experience:** The database model stores business truth (e.g., a worker logged check-in at 09:03 AM). How that check-in is displayed (e.g., "On Time", "Late", or hidden behind a weekly scorecard) is computed at the presentation layer. We do not store formatted UI strings or temporary visual states in the database.

---

## 3. Integration & Webhooks
Verity is designed to coexist with legacy systems (e.g., SAP, QuickBooks, external HR payroll).
*   **API-First Design:** Every feature inside Verity's Owner and Worker shells runs on the same APIs that are exposed to external developers.
*   **Webhook Reliability:** External integrations consume platform events. Webhook delivery must be transactional. Outbox events are written to a database queue (`WebhookOutbox`) during the primary Action transaction and delivered asynchronously with backoff.
*   **Connector Boundaries:** Verity does not permit external systems to write directly to the database. All external integrations must modify state by invoking standard Verity Actions, ensuring business logic, invariants, and validation rules are always enforced.

---

## 4. Observability & Observability Targets
*   **System Diagnostics:** Logging must categorize into `SystemLogs` (infrastructure metrics, network latency) and `OperationalAudit` (business state changes, employee clock-ins, overrides).
*   **Visible Failures:** If an integration or automated rule fails, the failure is surfaced in the Owner Console as an active warning (e.g., "QuickBooks Sync Failed: Invoice #102"). We do not hide operational errors in text files.

---

## 5. Observability and Performance Priorities
We prioritize real-world experience over synthetic benchmarks.
*   **Frontline Latency:** Mobile operations must load the "My Day" view and accept check-ins in $< 1.5\text{s}$ even on 3G connections.
*   **Query Safety:** All tenant list queries must map to database indexes. We explicitly index search columns (like `factoryId` and `date`/`startTime`) in models like `ShiftSchedule` and `Appointment` to prevent full table scans.

---

## 6. The AI Position & Constraints
We maintain a strict boundary for Artificial Intelligence:
*   **AI as an Assistant, Not an Author:** AI may assist with natural language queries, document search, summaries, and work order recommendations.
*   **Deterministic Correctness:** No core business rules, permissions checks, workflow state transitions, or financial ledger actions can depend on AI output. Every critical operational mutation must run through deterministic code.
*   **Explainability:** If AI recommends a scheduling change or flags an anomaly, it must provide the underlying data points that led to that suggestion.

---

## 7. Versioning & Upgrade Immunity
*   **Backwards Compatibility:** Database migrations must never break active client applications. When renaming fields or deprecating models, the change must execute in three phases:
    1.  *Phase 1:* Add new field, double-write to both.
    2.  *Phase 2:* Migrate old data, point reads to the new field.
    3.  *Phase 3:* Remove the old column.
*   **Workflow Snapshotting:** Active work orders must run on the workflow version that was active when they were committed. If a manager modifies the work order workflow steps, in-flight work orders must complete under their original rules.
