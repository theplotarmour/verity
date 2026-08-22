# Retry Strategy

## Purpose
Defines how transient failures are handled across workflows and jobs.

## Scope
- Retry policies
- Backoff algorithms
- Dead letter queues

## Authority
- Bible Synthesis ADOPTED: Temporal patterns (replay determinism, durable workflow, timeouts, exponential backoff)

## Prerequisites
- Background Jobs

## Specification Requirements
- N/A

## Approved Architecture
- **Temporal Patterns**: Replay determinism for durable workflow execution (Authority: Bible Synthesis ADOPTED).
- **Timeouts**: Enforced at activity and workflow level.
- **Backoff**: Exponential backoff with jitter.
- **Idempotent Retry**: Retrying a job must not create duplicate effects.
- **Dead Letter Queue (DLQ)**: For permanently failed jobs after exhausting retries.

## Implementation Contract
1. Implement a retry utility/wrapper for activities.
2. Configure default policies (e.g., 3 retries, max backoff 1 minute, factor 2).
3. Ensure all wrapped activities are idempotent.

## Constraints & Invariants
- PRN-001: Explainable Automation.

## Dependencies
- Idempotency

## Failure Modes
- Persistent failure - Moves to DLQ.

## Testing Requirements
- Test backoff intervals and jitter.
- Test DLQ routing on max retries.

## Conformance Checks
- N/A

## Traceability
- N/A

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Specific default retry parameters.
