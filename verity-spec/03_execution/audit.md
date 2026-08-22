# Verity Master Platform Specification

## 03_execution/audit.md

## Provenance
*   **Primary Sources**: `reference/keycloak/verity-implications.md` / `reference/plane/verity-implications.md` / `reference/openproject/architectural-patterns.md` (Journalized History)
*   **Verity Bible Authority**: [verity-bible/volume_3_execution_workflows.md](file:///D:/Code/verity/verity-bible/volume_3_execution_workflows.md) (Section 4: Concurrency, Execution & Conflict Rules - Append-only Event Sourcing)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Audit Logging Invariants

Every change, verification, override, or deletion of a core business record must generate an immutable, traceable log entry. 

---

## 2. Separate Audit Streams

To optimize performance and database sizing, the platform segregates audits into two separate logical tables with different retention policies:

### EXE-AUD-001: Operational Audit Stream
*   **Description**: Logs changes to work orders, checklists, coordinates, and task completions.
*   **Retention**: Infinite (required for commercial contract dispute resolutions and historical SLAs).
*   **Entity Mapping**:
    *   `WorkOrderActivity`: `work_order_id` (FK), `actor_id` (FK), `field_changed` (String), `old_value` (Text), `new_value` (Text), `timestamp`.
*   **Status**: `[FACT]`
*   **Traceability**: Mapped from OpenProject journal design and Plane activity log.

### EXE-AUD-002: Security Audit Stream
*   **Description**: Logs authentication attempts, permission mutations, configuration parameter edits, role reassignments, and API key generation.
*   **Retention**: Mapped to security compliance requirements.
*   **Entity Mapping**:
    *   `SecurityAuditEvent`: `event_type` (auth_success | auth_failed | permission_escalated), `actor_id` (FK), `ip_address` (String), `payload` (JSONB), `timestamp`.
*   **Status**: `[FACT]`
*   **Traceability**: Keycloak Security Audit framework.

---

## 3. Log Immutability

### EXE-AUD-003: Lock Policy
*   **Rule**: The audit tables (`WorkOrderActivity` and `SecurityAuditEvent`) reject SQL UPDATE and DELETE operations at the database constraint level. Once committed, rows are immutable.
*   **Status**: `[FACT]`
