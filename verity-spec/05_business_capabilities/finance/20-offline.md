# Verity Master Platform Specification

## finance/20-offline.md

## Provenance
*   **Primary Sources**: `reference/frappe/verity-implications.md`
*   **Verity Bible Authority**: `verity-bible/volume_5_operations_security.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Conflict Policy Assignment Matrix

This document maps all write actions and entity fields within the `finance` capability to their designated Conflict Policy class.

| Mutation Type | Target / Action | Conflict Policy Class |
| :--- | :--- | :--- |
| Descriptive Metadata | Update Description | `LWW_ALLOWED` |
| Operational State | State Transitions | `COMMAND_REJECTED` |
| Financial State | Invoicing / Amounts | `SERVER_AUTHORITATIVE` |
| Append-only Evidence | Checkpoint Scan / Photos | `APPEND_ONLY` |
| Attendance Event | Clock-in | `APPEND_ONLY` |
| Resource Assignment | Assign Resource | `COMMAND_REJECTED` |
| Configuration | Workflow Policy | `COMMAND_REJECTED` |

### REQ-FINANCE-OFFLINE-001
*   **Requirement**: Every mutating transaction in `finance` must evaluate conflict policy classes before resolving offline queues.
*   **Status**: `[DECIDED]`
