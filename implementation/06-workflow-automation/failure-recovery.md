# Failure Recovery

## Purpose
Defines how the system recovers from partial failures in multi-step operations.

## Scope
- Durable execution
- Compensation actions
- Saga pattern

## Authority
- Bible Synthesis ADOPTED: Temporal replay determinism

## Prerequisites
- Workflow Engine
- Background Jobs

## Specification Requirements
- N/A

## Approved Architecture
- **Durable Execution**: Workflow state is persisted and can resume after a crash.
- **Compensation Actions**: Undo partial work when a workflow fails midway.
- **Partial Failure Isolation**: One capability's failure should not cascade.
- **Recovery Protocol**: Detect, diagnose, recover.

## Implementation Contract
1. Workflows must record state transitions to the database.
2. For multi-step operations, define compensation steps for each forward step.

## Constraints & Invariants
- PRN-001: Least Surprise.

## Dependencies
- Workflow Engine

## Failure Modes
- Compensation failure - Requires manual intervention / dead letter queue.

## Testing Requirements
- Test compensation execution on forced failure.

## Conformance Checks
- N/A

## Traceability
- N/A

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Specific implementation of the Saga pattern.
