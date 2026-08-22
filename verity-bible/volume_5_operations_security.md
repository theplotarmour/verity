# VERITY MASTER BIBLE — VOLUME V
## Platform Operations, Tenancy & Offline Sync Constitution

This volume governs the infrastructure and operations of the Verity platform: multi-tenancy isolation rules, data integrity constraints, API integrations, and the Offline Synchronization Engine.

---

## 1. Security & Tenancy Isolation
Verity operates on a strict multi-tenant architecture. Data leaks between Organizations are catastrophic failures.

### A. Tenant Isolation [FACT]
1.  **Logical RLS Partitioning:** Every query executed by the server must be scoped by `tenantId`, the root data-isolation boundary. `Organization` (a nested business unit) and `Location` (an operational site) are scoping *refinements within* a Tenant and are never isolation boundaries in their own right. (Authority: ADR-005; GOV-TER-010; GOV-TER-017.)
2.  **Cross-Tenant Guardrails:** Database operations must use Row-Level Security (RLS) policies at the PostgreSQL engine level, or enforce tenancy checks within the database driver middleware. Tenant context is derived strictly from the authenticated session, never from user-supplied query parameters.
3.  **Cross-Tenant Relationships:** It is strictly forbidden for any entity in tenant $A$ to reference a foreign key in tenant $B$. Shared systems (like global product templates) must use cross-tenant mappings that copy configuration rather than sharing direct entity rows.
4.  **Authentication Boundary Policy:** Verity uses a single global authentication realm. Sub-organizations are modeled as `Groups` with composite role bindings. If a contractor works for multiple tenants, their single user identity is granted distinct memberships under each group. Tenancy isolation is strictly enforced at the database layer on every request.
5.  **AST-based Analytical Sandboxing:** Reporting/analytical queries must be requested as structured JSON Abstract Syntax Tree (AST) payloads. The backend query processor intercepts the AST and automatically injects a `tenant_id` filter before compiling it to SQL/queries, preventing database injection and cross-tenant leakage.

### B. Product Rules vs. Technical Implementation Rules
*   **The Product Rule:** Tenant isolation is absolute. Under no circumstances can data from Tenant A be visible to Tenant B.
*   **The Implementation Rule [PROPOSED]:** Row-Level Security (RLS) is the default database mechanism for enforcing the tenant isolation requirement. Alternative storage isolation patterns (such as separate schemas or separate databases) may be implemented for large-enterprise tier tenants without mutating the platform's logical data models.

---

## 2. Offline Synchronization Engine Specification [PROPOSED]
Operating in field environments requires a robust, fault-tolerant offline synchronization engine. We establish strict platform rules:

### A. Offline Command Structure
An offline device enqueues mutating actions locally as **`OfflineCommands`**:
```json
{
  "commandId": "uuid-v4-token",
  "action": "work_order.job.complete",
  "payload": { "workOrderId": "123", "evidenceIds": ["456"] },
  "deviceTimestamp": "2026-08-22T02:15:00.000Z",
  "userId": "user-999"
}
```

### B. Core Sync Invariants:
1.  **Synchronization Identity:** Every `OfflineCommand` must carry a unique, client-generated `commandId`.
2.  **Idempotency:** The server checks the `commandId` before processing. If a command is transmitted multiple times (due to network retries), the server processes it exactly once and returns the cached result.
3.  **Chronological Replay:** Commands must replay on the server in the exact chronological order of their `deviceTimestamp` to preserve process continuity.
4.  **Optimistic UI Mutation:** The mobile client applies changes to its local store immediately. These changes are flagged as `Unsynced` until the server returns confirmation.
5.  **Heartbeat Pulse Merging:** High-frequency logging streams (e.g., GPS coordinates, session activity logs) sent from offline/online clients must be merged by the sync engine. Consecutive status logs with identical data payloads are merged by extending the `duration` of the primary log entry, preventing database write amplification.

### C. Conflict Handling Rules:
*   **Field-Level Last-Write-Wins:** If two offline users edit different fields on the same record, the server merges the changes. If they edit the same field, the server applies the value with the latest `deviceTimestamp`.
*   **State Conflict Aborts:** If an offline action modifies a record whose state has changed server-side in a way that violates preconditions (e.g., checking into a shift that was cancelled by a manager), the replay aborts, is flagged in the `Audit Log`, and enqueues a sync exception in the Worker workspace for manual resolution.
*   **Delete Conflicts:** If User A deletes a record offline while User B edits it offline, the delete action wins by default. The edit is recorded in the audit log as "Discarded (Target Deleted)".
*   **Authorization Conflict:** If a worker's permissions were revoked while they were offline, their offline commands are rejected by the server upon sync.

---

## 3. The Billing Boundary [INFERRED]
Verity is an operational platform, not a general ledger accounting tool. We draw a strict boundary for billing:

*   **Operational Completion:** Billing calculations are triggered exclusively by the `work.completed` or `booking.verified` events.
*   **Decoupled Transactions:** The billing engine listens to operational events and writes to a separate, asynchronous billing database. Operational workflows never wait for payment gateway APIs to succeed before updating job states.
*   **Cancellation Charges:** The billing engine calculates cancellation fees based on operational evidence (e.g., travel time spent before cancellation) without corrupting the Work Order state machine.

---

## Amendment Record

**AMD-001 — Tenancy scoping terminology (Volume V §1.A.1).**
The original clause scoped queries by `organizationId` "or `factoryId` (for specific sites/outlets)".
`factoryId` was a legacy VEDA site-isolation identifier that survived into the constitutional
text. It conflicted with ADR-005 (Tenant is the root data-isolation boundary; Organization is a
nested unit inside a Tenant), with GOV-TER-017 (`Location` is the canonical term for a site, and
`factory_outlet` is a prohibited synonym), and with Spec PLA-TEN-001. Volume VI §INV-001 and the
Security Model summary carried the same remnant and are amended identically.
Authorised by the product owner as a one-time constitutional edit.
