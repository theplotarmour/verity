# Background Jobs

## Purpose
Defines the strategy for executing asynchronous background tasks.

## Scope
- Job queueing and execution
- Job types

## Authority
- Bible Synthesis ADOPTED: Temporal patterns (replay determinism, durable execution, timeouts, exponential backoff)
- Authority: EXISTING INFRASTRUCTURE (Inngest is installed but never wired up)

## Prerequisites
- Retry Strategy

## Specification Requirements
- N/A

## Approved Architecture
- **Job Types**: Event processing, scheduled tasks (cron), long-running workflows.
- **Durability**: Jobs must be durable and support Temporal-like patterns (replay determinism).

## Implementation Contract
1. Define the interface for a Job queue.
2. If using Inngest, configure the client and handlers. If custom, implement polling workers.

## Constraints & Invariants
- PRN-001: Least Surprise / Explainable Automation.

## Dependencies
- Workflow Engine

## Failure Modes
- Worker crash - Job remains unacknowledged, picked up by another worker.

## Testing Requirements
- Test job durability and recovery.

## Conformance Checks
- N/A

## Traceability
- N/A

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: whether to adopt Inngest or implement a simpler job queue.
