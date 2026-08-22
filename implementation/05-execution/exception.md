# Exception Tracking (exception.md)

## Purpose
This document defines the implementation for formal deviations and exceptions from standard workflows in Verity.

## Scope
**In Scope:**
- Exception entities (Schedule, Quality, Safety)
- Automated vs. Manual triggers
- Resolution workflows

**Out of Scope:**
- General application crash logs (handled by Sentry)

## Authority
- **Bible V3:** Formal deviations require explicit tracking.

## Prerequisites
- Work Order and SLA modules must be implemented.

## Specification Requirements
- **WHAT MUST EXIST:** A formal, trackable record when an operation deviates from the standard path.

## Approved Architecture
- **Data Model (Authority: Bible V1):** PostgreSQL.

## Implementation Contract
Claude Code shall implement exception tracking as follows:
1. Define a Prisma model `ExceptionRecord` linking to the target entity (e.g., `WorkOrder`).
2. Fields must include `type` (SCHEDULE, QUALITY, SAFETY), `source` (MANUAL, AUTOMATED), `status` (OPEN, RESOLVED), and `description`.
3. Build domain events:
   - Automated: When SLA breach is detected, emit an event that creates an `ExceptionRecord`.
   - Manual: Provide commands for workers/supervisors to report exceptions from the field.
4. Resolution requires an explicit command (`resolveException`), which may trigger or require an Approval (see `approval.md`).

## Constraints & Invariants
- Exceptions must not halt the system but must flag the Work Order visually and prevent closure until resolved.

## Dependencies
- **Depends on:** Work, SLA, Approvals.

## Failure Modes
- **Ignored Exceptions:** Prevented by invariant that a `WorkOrder` with OPEN exceptions cannot transition to `CLOSED`.

## Testing Requirements
- Integration test ensuring `close` command fails if an open exception exists on the Work Order.

## Conformance Checks
- Ensure exceptions are immutable in their creation data, only `status` and `resolution` fields can change.

## Traceability
- Bible V3

## Open Decisions
- None.
