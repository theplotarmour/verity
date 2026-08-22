# Work Execution (work.md)

## Purpose
This document defines the implementation of the Work Order (Work) primitive for the Verity platform. It serves as the primary execution unit, representing a single committed service obligation at a specific location.

## Scope
**In Scope:**
- Work Order lifecycle and state machine
- ChecklistItem integration (sub-steps)
- Rework and partial execution patterns
- Preconditions for state transitions

**Out of Scope:**
- Assignment logic (see `assignment.md`)
- Dispatching (see `dispatch.md`)
- Schedule templates (see `scheduling.md`)

## Authority
- **Bible V2 (Meta-Model):** Work Order states and preconditions, Resource constraints.
- **Bible V3 (Execution Engine):** Partial execution, Rework patterns, Optimistic concurrency.
- **Spec GOV-TER-001:** Work (Work Order) definition.
- **Spec GOV-TER-003:** ChecklistItem definition.
- **Constitutional Invariant INV-002:** Read-Only Closed States.

## Prerequisites
- Tenancy isolation foundation must be established.
- Location and Party models must exist.
- Command pipeline (MET-ACT-001→004) must be operational.

## Specification Requirements
- **WHAT MUST EXIST:** A `Work` entity representing a single committed service obligation at a Location (GOV-TER-001).
- **WHAT MUST EXIST:** `ChecklistItem` sub-steps within the Work Order without independent states (GOV-TER-003).
- **WHAT MUST EXIST:** Partial execution must spawn child work orders.
- **WHAT MUST EXIST:** Rework must spawn linked child Re-work Orders without mutating the closed parent.

## Approved Architecture
- **State Machine (Authority: Bible V2+V3):** States include Draft, Scheduled, In-Progress, Pending-Verification, Completed, Cancelled, Closed.
- **Concurrency (Authority: Bible V3):** Optimistic concurrency via version tokens (`E_CONFLICT`).
- **Idempotency (Authority: Bible V3):** Idempotent submission tokens required for execution commands.
- **Data Model (Authority: Bible V1):** PostgreSQL with Prisma as the System of Record.

## Implementation Contract
Claude Code shall implement the Work Order domain as follows:
1. Define a Prisma model `WorkOrder` with strict state enums (`DRAFT`, `SCHEDULED`, `IN_PROGRESS`, `PENDING_VERIFICATION`, `COMPLETED`, `CANCELLED`, `CLOSED`).
2. Implement transition commands using the command pipeline:
   - `createWorkOrder`: Initializes as `DRAFT`.
   - `scheduleWorkOrder`: Transitions `DRAFT` → `SCHEDULED`. Requires resource assignment and location.
   - `checkIn`: Transitions `SCHEDULED` → `IN_PROGRESS`. Guard: session resource MUST equal assigned resource.
   - `submit`: Transitions `IN_PROGRESS` → `PENDING_VERIFICATION`. Guard: mandatory evidence must be uploaded.
   - `verify`: Transitions `PENDING_VERIFICATION` → `COMPLETED`. Guard: user must have Supervisor role.
   - `cancel`: Allowed from any pre-terminal state. Pre-start execution frees capacity; mid-execution captures spent hours.
   - `close`: Transitions `COMPLETED` → `CLOSED`. Enforces INV-002 (permanent lock).
3. Implement `ChecklistItem` as an owned child array in the `WorkOrder` aggregate, updated entirely via the parent command.
4. For partial execution, implement a domain service that clones uncompleted items into a new child Work Order.

## Constraints & Invariants
- **INV-002:** Once a Work Order enters the `CLOSED` state, no fields, checklist items, or linked entities may be mutated.
- State transitions must exclusively happen via explicit, validated commands, never by direct field updates.

## Dependencies
- **Depends on:** Location, Resource, Assignment, Evidence.
- **Depended on by:** SLA timers, Billing/Invoicing, Audit.

## Failure Modes
- **Concurrent Updates:** Two users modifying the same Work Order. Handled via optimistic concurrency version tokens (`E_CONFLICT`).
- **Precondition Failure:** E.g., `checkIn` without being at the assigned Location. Handled by command validation rejection.

## Testing Requirements
- Unit test every state transition guard.
- Integration test for partial execution (child spawning).
- Integration test validating INV-002 upon closure.

## Conformance Checks
- Ensure `ChecklistItem` has no independent API endpoints for mutation; must be updated through `WorkOrder`.

## Traceability
- GOV-TER-001, GOV-TER-003
- INV-002

## Open Decisions
- None.
