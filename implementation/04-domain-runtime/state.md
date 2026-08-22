# Purpose
Defines the state machine pattern for stateful domain entities (e.g., Work Order, Party).

# Scope
Covers states, transitions, invariant enforcement on closed states, and side effects.

# Authority
- INV-002: Read-Only Closed States
- Spec MET-ACT-004: Event Emission on Commit
- Spec GOV-TER-001: Standard Terminology & States

# Prerequisites
- Base Entity Pattern (`entity.md`)

# Specification Requirements
- Every stateful entity has a defined state machine.
- **Work Order states** (GOV-TER-001): Draft → Scheduled → In-Progress → Pending-Verification → Completed (or Cancelled/Closed).
- **Party states**: Invited → Active → Suspended → Archived.
- INV-002: Read-Only Closed States — once Closed, all fields permanently locked.
- MET-ACT-004: State change MUST emit an event.

# Approved Architecture
- **State Machine Definition**: Explicit TypeScript definitions of states, allowed transitions, guards, and side effects.
- **DB Enforcement**: DB-level constraints (where possible) or strict Prisma middleware for INV-002.

# Implementation Contract
- Define states as exact string literal unions or Enums.
- Define a transition matrix: `Record<State, State[]>`.
- Implement **Guards**: Preconditions checked before a transition is allowed (MET-ACT-003).
- Implement **Side Effects**: Actions triggered by the state change (e.g., free capacity on cancellation).
- Enforce **INV-002**: If an entity is in a terminal state (Completed, Cancelled, Closed), any command attempting mutation MUST be rejected immediately.

# Constraints & Invariants
- INV-002: Read-Only Closed States.

# Dependencies
- Depends on: Command Pipeline (`command.md`)

# Failure Modes
- Invalid transition attempt throws `ValidationError`.
- Mutation on closed entity throws `E_FORBIDDEN` or `ValidationError`.

# Testing Requirements
- Exhaustively test the transition matrix.
- Verify all mutation commands fail on closed states.

# Conformance Checks
- Static analysis to ensure state strings match `GOV-TER-001`.

# Traceability
- INV-002, GOV-TER-001, MET-ACT-004

# Open Decisions
- **DEC-BIBLE-001**: Party Lifecycle Initial State (reconciling Prospect vs Invited as the starting lifecycle state).
- **DEC-BIBLE-003**: Terminal State Path of Work Orders (reconciling linear closed flow vs invoicing archive boundary).
