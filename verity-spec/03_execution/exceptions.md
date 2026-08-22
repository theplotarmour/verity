# Verity Master Platform Specification

## 03_execution/exceptions.md

## Provenance
*   **Primary Sources**: `odoo-prd/14-error-and-exception-model.md` / `reference/calcom/verity-implications.md` (OOO delegation)
*   **Verity Bible Authority**: [verity-bible/volume_3_execution_workflows.md](file:///D:/Code/verity/verity-bible/volume_3_execution_workflows.md) (Section 2: Cancellation & Partial Execution - Exceptions list)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Operational Execution Exceptions

During field operations, various events can disrupt normal scheduling. Verity regulates these disruptions through strict exception rules:

---

## 2. Core Exceptions

### EXE-EXC-001: No-Show Trigger
*   **Rule**: If an assigned Resource fails to check in (state remains `Scheduled` and check_in action is not executed) within the configured grace period (e.g. 30 minutes after `scheduled_start_at`):
    1.  The system flags the Work Order as `Late Check-in`.
    2.  The scheduler UI displays a high-priority warning.
    3.  A notification is sent to the dispatcher and supervisor.
    4.  The system optionally releases the resource (moving state back to `Draft` for reassignment) depending on tenant configuration.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### EXE-EXC-002: Incomplete Work (Spawning Child)
*   **Rule**: If a worker cannot complete the job (e.g. missing parts, site locked) and submits a status of `Partially Completed`:
    1.  The worker must select an exception reason code.
    2.  The current Work Order transitions to `Pending-Verification` (calculating billing on completed items only).
    3.  On verification approval, the system automatically spawns a secondary child `WorkOrder` containing the remaining uncompleted tasks, maintaining a parent-child relationship.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### EXE-EXC-003: Defective Re-work
*   **Rule**: If a completed and verified job is found to be defective, the original Work Order remains locked (read-only) for audit integrity. The supervisor triggers a `Re-work Order` which is linked as a child to the original job, inheriting its customer details and location.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### EXE-EXC-004: Abandoned Job
*   **Rule**: If a job was started (state = `In-Progress`) but the resource became inactive (e.g. device lost power or worker walked off site) and the schedule window expires:
    1.  The system transitions the job state back to `Draft` (available for dispatch).
    2.  The assigned Resource is flagged as `Investigating`.
    3.  An exception event is generated on the audit logs.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`
