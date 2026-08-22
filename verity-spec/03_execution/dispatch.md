# Verity Master Platform Specification

## 03_execution/dispatch.md

## Provenance
*   **Primary Sources**: `odoo-prd/09-ui-ux-model.md` / `reference/openproject/behavior-inventory.md`
*   **Verity Bible Authority**: [verity-bible/volume_3_execution_workflows.md](file:///D:/Code/verity/verity-bible/volume_3_execution_workflows.md) (Section 4: Concurrency, Execution & Conflict Rules - Manual Conflict warnings)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. The Dispatch Board

The **Dispatch Board** is the primary system of control dashboard used by dispatchers to manage, monitor, and assign Work Orders to resources in real-time.

---

## 2. Dispatch Control Actions

The platform supports four atomic dispatch operations:

### EXE-DIS-001: Assign
*   **Action**: Binds a Work Order to a Resource calendar slot.
*   **State change**: Transitions `WorkOrder` status from `Draft` to `Scheduled`.
*   **Side-effect**: Enqueues a push notification and SMS to the assigned worker's mobile application.
*   **Status**: `[UNKNOWN]`

### EXE-DIS-002: Release (Unassign)
*   **Action**: Clears the resource assignment from a Work Order.
*   **State change**: Transitions `WorkOrder` status back to `Draft` (available for rescheduling).
*   **Status**: `[UNKNOWN]`

### EXE-DIS-003: Lock Schedule
*   **Action**: Locks an Appointment block, preventing automated scheduling engines or client self-booking portals from modifying the assignment.
*   **Status**: `[UNKNOWN]`

### EXE-DIS-004: Broadcast Dispatch Alert
*   **Action**: Triggers an alert broadcast to all workers in a specific geographic territory for urgent, unassigned Work Orders (e.g. emergency leak repair). The first qualified resource to accept the job clocks in.
*   **Status**: `[UNKNOWN]`

---

## 3. Conflict Flagging (Rejection of Auto-Shift)

### EXE-DIS-005: Manual Triage Policy
*   **Rule**: If a preceding Work Order is delayed (technician clocks out late), successor jobs assigned to the same worker are flagged as a `Schedule Conflict` (overlap alert) on the Dispatch Board. The system does not automatically shift successor dates (avoiding routing overlaps), forcing manual dispatcher triage.
*   **Status**: `[UNKNOWN]`
