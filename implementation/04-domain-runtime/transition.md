# Purpose
Defines how state transitions are executed within the system.

# Scope
Covers transition execution via the command pipeline, pre-transition hooks, preconditions, and terminal state handling.

# Authority
- Spec PLA-EXT-004: Pre-transition hooks
- Bible V3: Pre-start cancellation frees capacity; mid-execution cancellation records spent hours
- Bible V3: Partial execution spawns child work orders for remaining tasks
- Bible V3: Completed rework creates linked child Re-work Orders (INV-002)

# Prerequisites
- Command Pipeline (`command.md`)
- State Machine (`state.md`)

# Specification Requirements
- Transitions execute as commands (MET-ACT-001→004).
- Pre-transition hooks supported (PLA-EXT-004).

# Approved Architecture
- **Transition Execution**: Standard command pipeline.
- **Rework / Partial Execution**: Spawning child entities (Authority: Bible V3).

# Implementation Contract
- **Command Integration**: A state transition is just a specific Command.
- **Pre-transition hooks**: `before_transition` handlers executed during the precondition phase.
- **Preconditions**: E.g., `check_in` requires an assigned resource; `submit` requires evidence.
- **Terminal States**: `Completed`, `Cancelled`, `Closed`. Once entered, no exit.
- **Business Logic (Bible V3)**:
  - Pre-start cancellation: Free assigned capacity.
  - Mid-execution cancellation: Record spent hours.
  - Partial execution: Spawn child Work Orders for remaining tasks.
  - Completed rework: Create linked child Re-work Orders to preserve INV-002 on the parent.

# Constraints & Invariants
- Transitions MUST emit post-transition events.
- INV-002: Parent entities cannot be reopened for rework.

# Dependencies
- Depends on: Command Pipeline

# Failure Modes
- Precondition hook throws error, blocking transition.

# Testing Requirements
- Test business rules (capacity freeing, child spawning) on specific transitions.

# Conformance Checks
- Ensure terminal state transitions are one-way.

# Traceability
- PLA-EXT-004, INV-002

# Open Decisions
- None
