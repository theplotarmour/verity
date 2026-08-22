# Purpose
Defines the strategy for testing multi-step platform workflows and state machine transitions.

# Scope
Entity lifecycle states, SLA timers, automation rules, multi-step user journeys.

# Authority
- Authority: EXISTING INFRASTRUCTURE (Vitest 4.1.10)
- Authority: Bible V2 (State Machines)

# Prerequisites
- Command pipeline configured.

# Specification Requirements
- WHAT MUST EXIST: Tests covering every valid and invalid transition in core entity lifecycles.

# Approved Architecture
- Integration tests orchestrating multiple commands in sequence.

# Implementation Contract
- Test multi-step workflows: create → schedule → assign → check-in → execute → submit → verify.
- Test SLA timers (using mocked timers in Vitest).
- Test Automation rules triggered by state changes.

# Constraints & Invariants
- INV-002: Read-Only Closed States MUST be verified across all workflows.

# Dependencies
- Depends on Integration Testing standards.

# Failure Modes
- Brittle tests due to exact timestamp matching: Use `vi.useFakeTimers()`.

# Testing Requirements
- Every state transition must have a positive (allowed) and negative (rejected) test.

# Conformance Checks
- State transition matrix coverage.

# Traceability
- MET-ACT-001→004

# Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Syntax for declarative state machine testing matrices.
