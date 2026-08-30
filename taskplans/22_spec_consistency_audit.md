# Task Plan 22 — Specification Consistency Audit

This document executes the Specification Consistency Audit, cross-examining the ADRs, Combined PRD, Bible v2, Spec v2, and Roadmap v2 to eliminate design discrepancies, verify module boundaries, and map out the Enterprise Readiness Gate criteria before coding begins.

---

## 1. Traceability & Consistency Review

### 1.1 Architecture Contradictions Check
*   **Audit**: Compare `17A ADRs` to `20 Spec v2`.
*   **Finding**: `[OBSERVED]` Clean alignment. 
    *   ADR-001 (Portability) maps to VERITY-INFRA-001 (Containerized Execution).
    *   ADR-006 (S3 Storage) maps to VERITY-INFRA-002 (S3 Storage wrapper).
    *   ADR-003 (Identity Federation) maps to VERITY-SEC-001 (OIDC Session Verification).
*   **Resolution**: No contradictions detected.

### 1.2 Core vs. Vertical Boundaries Check
*   **Audit**: Verify that domain-specific schemas (Logistics LR entries, Construction BOQ files) have not leaked into the Platform Core configuration rules.
*   **Finding**: `[OBSERVED]` The Platform Core defines generic models (e.g. dynamic Checklist Forms, generic Workflow state machines). No construction or logistics definitions exist inside the Platform Core definitions of `18 Combined PRD` or `19 Bible v2`.
*   **Resolution**: Clear structural segregation maintained.

### 1.3 Cloud vs. Enterprise Deployment Checks
*   **Audit**: Search for Vercel/Supabase assumptions remaining in the specifications.
*   **Finding**: `[OBSERVED]` `18 Combined PRD` correctly shifts the database dependency from Supabase Cloud to standard self-hosted PostgreSQL. No edge function dependencies remain in the specifications.
*   **Resolution**: Portability requirements are fully covered in `20 Spec v2`.

---

## 2. Structural & Conceptual Clarifications

### 2.1 The Authentication & Authorization Boundaries
To prevent implementation bugs, Verity defines security gates across 5 distinct domains:
1.  **Authentication**: Verification of user identity (delegated to external Keycloak/OIDC JWT tokens).
2.  **Identity Federation**: Synchronization of users/groups from corporate directories (AD/LDAP) (configured entirely inside Keycloak, invisible to Verity Core).
3.  **Session Management**: Active connection sessions (managed locally inside NextAuth/cookie layers).
4.  **Application Authorization**: Checking if a user's role permits executing an action (e.g. `user.role === 'manager'`).
5.  **Tenant / Spatial Authorization**: Filtering database results using Prisma context filters based on the user's `tenantId` and `locationId`.

---

### 2.2 Workflow Classification Matrix
Workflows in Verity are segregated by execution frequency and durability needs:

| Type | Engine | Use Case |
|---|---|---|
| **State Machine** | `WorkflowEngine` (Application layer) | Order transitions (`draft` -> `packed` -> `dispatched`). |
| **Background Job** | BullMQ on Redis | Generating invoice PDFs, rendering reports. |
| **Scheduled Task** | BullMQ cron threads | Weekly inventory counts, emailing aging summaries. |
| **Durable Workflow** | *Externalized* (Temporal, optional) | Multi-day cross-system government payment sagas. |

---

### 2.3 Storage, Auditing, and Operations

#### Storage
Verity owns the storage interface. The application interacts strictly with a standard `StorageService` class that implements S3 client SDK calls. We are not coupled to a single vendor; the target S3 endpoint (AWS, MinIO, or SeaweedFS) is swap-configured via environment variables.

#### Audit
An auditable business event is defined as any write mutation that changes system balances or state values:
*   Submitting/Cancelling Invoices.
*   Moving inventory stock items between locations.
*   Altering Role mappings or User permissions.

#### Backup/Restore
Enterprise mode requires automated shell scripts bundled inside the deployment directory that execute hourly database dumps (`pg_dump`) and sync backups to the configured S3 storage bucket.

---

## 3. Specific Constitutional Refactoring

### Stock Ledger Relocation
*   **Conflict Detected**: The initial `19 Bible v2` made "stock-ledger immutability" a global constitutional law (BIBLE-005). This is a domain boundary leak, as a municipal government portal or HR dashboard running on Verity Core does not manage physical stock items.
*   **Refactored Constitutional Rule**: 
    ```text
    BIBLE-005: Material Business History Integrity
    Material business history MUST NOT be silently mutated. Operational records 
    representing stock movements or general ledger financial entries MUST be stored 
    as append-only transaction logs. Direct updates to balances are prohibited.
    ```
*   **Domain Relocation**: The explicit concept of the "Stock Ledger" table is moved strictly to the **Inventory Domain Pack** as a local schema enforcement.

---

## 4. Enterprise Readiness Gate Checklist

To declare the first engineering milestone—**Verity Portable Runtime v2**—successful, the architecture must pass all 12 mandatory gates:

1.  **[ ] Containerized Deployment**: Stack starts Postgres, Redis, and Next.js Web via Docker Compose.
2.  **[ ] PostgreSQL Portability**: Schema database loads and runs on clean PostgreSQL container.
3.  **[ ] Storage Abstraction**: PDFs and images upload successfully to MinIO/S3 adapter.
4.  **[ ] Authentication Boundary**: JWT OIDC validation runs without Supabase Cloud checks.
5.  **[ ] RBAC Model**: Scoped permissions correctly gate test users.
6.  **[ ] Tenant Isolation**: Prisma middleware filters query outputs using `tenantId`.
7.  **[ ] Audit Log**: Append-only log table records mock data mutations.
8.  **[ ] Migration Engine**: Docker entrypoint runs database migrations on startup.
9.  **[ ] Backup/Restore**: Verified pg_dump/restore scripts exist.
10. **[ ] Health Checks**: API exposes `/api/health` and `/api/metrics` routes.
11. **[ ] Configuration/Secrets**: All credential keys are injected via environmental files.
12. **[ ] Security Baseline**: Routes block unauthorized access.
