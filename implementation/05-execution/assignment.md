# Assignment Management (assignment.md)

## Purpose
This document details the implementation of resource-to-work bindings, managing how and when a `Resource` is allocated to a `WorkOrder` or Shift, including reservation guarantees.

## Scope
**In Scope:**
- Assignment link between `Resource` and `WorkOrder`/Shift
- Reservation system (TTL)
- Conflict and double-booking prevention

**Out of Scope:**
- Automated scheduling algorithms (manual only)
- Schedule definitions (see `scheduling.md`)

## Authority
- **Bible V2 (Meta-Model):** `AssignmentReservation` with `releaseAt` TTL.
- **Bible V3 (Execution Engine):** Manual conflict triage; pre-start cancellation frees capacity.
- **Bible Synthesis REJECTED:** Auto-slippage (successor date shifting).

## Prerequisites
- `Resource` and `WorkOrder` primitives must exist.

## Specification Requirements
- **WHAT MUST EXIST:** A binding between a `Resource` and a `WorkOrder`.
- **WHAT MUST EXIST:** A reservation mechanism to prevent double-booking during dispatch.
- **WHAT MUST EXIST:** No automatic successor date shifting (auto-slippage).

## Approved Architecture
- **Data Model (Authority: Bible V1):** PostgreSQL / Prisma.
- **Conflict Resolution Policy (Authority: User Matrix):** Assignment uses command validation.

## Implementation Contract
Claude Code shall implement the assignment logic as follows:
1. Define a Prisma model `Assignment` linking `Resource` and `WorkOrder`.
2. Define a Prisma model `AssignmentReservation` with a `releaseAt` datetime field (TTL).
3. When a dispatcher begins assigning a resource, create an `AssignmentReservation`.
4. If the reservation is not confirmed (turned into an `Assignment`) before `releaseAt`, it expires and the capacity is freed.
5. In command validation, explicitly query for overlapping `Assignment` or active `AssignmentReservation` records. If found, reject the command (No auto-slippage).
6. Dispatchers must manually resolve conflicts; the system simply highlights them.
7. Upon `cancel` of a Work Order before start, delete or deactivate the corresponding `Assignment` to free capacity immediately.

## Constraints & Invariants
- A `Resource` cannot have overlapping active assignments or reservations for exclusive work.
- The system MUST NEVER auto-adjust dates for downstream assignments (No auto-slippage).

## Dependencies
- **Depends on:** Resource, WorkOrder.
- **Depended on by:** Dispatch, Scheduling.

## Failure Modes
- **Race Conditions:** Two dispatchers booking the same resource simultaneously. Prevented by `AssignmentReservation` uniqueness/overlap constraints in the DB.

## Testing Requirements
- Unit test reservation expiration logic.
- Integration test for double-booking rejection.

## Conformance Checks
- Verify no code automatically shifts the start time of a Work Order due to a conflict.

## Traceability
- Bible V2, Bible V3

## Open Decisions
- None.
