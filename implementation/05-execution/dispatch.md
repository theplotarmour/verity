# Dispatch Management (dispatch.md)

## Purpose
This document defines the requirements and behavior of the Dispatcher board, focusing on manual assignment, conflict visualization, and capacity tracking.

## Scope
**In Scope:**
- Dispatcher view of available resources and pending work
- Conflict detection and alerts
- Manual assignment execution

**Out of Scope:**
- Automated dispatching algorithms

## Authority
- **Bible V3 (Execution Engine):** Manual conflict triage.
- **Bible Synthesis REJECTED:** Auto-slippage.

## Prerequisites
- Assignment and Scheduling modules must be complete.

## Specification Requirements
- **WHAT MUST EXIST:** A view mapping pending `WorkOrder` entities to available `Resource` capacities.
- **WHAT MUST EXIST:** Alerts when scheduling conflicts exist.

## Approved Architecture
- **Next.js 16 + React 19:** (Authority: EXISTING INFRASTRUCTURE)
- **Data Model:** Direct query to `Assignment` and `AvailabilityTemplate` projections.

## Implementation Contract
Claude Code shall implement the dispatch capabilities as follows:
1. Provide queries to fetch unified resource capacity: Available slots vs. Assigned load.
2. Implement visual conflict detection: When querying the dispatch board, identify if any Resource has overlapping assignments or `OutOfOfficeEntry` overlaps. Return a `conflict` flag.
3. The system strictly relies on the Dispatcher to resolve conflicts (reassign, cancel, or explicitly override if business rules allow).
4. Build commands to link a Pending Work Order to a Resource via the manual assignment pipeline.

## Constraints & Invariants
- The system must NEVER automatically reassign or reschedule work when a conflict is detected. It must only alert the dispatcher.

## Dependencies
- **Depends on:** Assignment, Scheduling, Work.

## Failure Modes
- **Stale View:** Dispatcher attempts to assign a slot already taken. Handled gracefully by `AssignmentReservation` and command validation (returns error, UI refreshes).

## Testing Requirements
- Integration test for dispatch query returning correct conflict flags for overlapping assignments.

## Conformance Checks
- Ensure manual assignment relies on the `scheduleWorkOrder` command (MET-ACT pipeline).

## Traceability
- Bible V3

## Open Decisions
- **IMPLEMENTATION DECISION REQUIRED:** Specific UI pattern for drag-and-drop or explicit assignment form in the React front-end.
