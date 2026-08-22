# Event Processing

## Purpose
Defines the event bus implementation and delivery guarantees.

## Scope
- Event publishing and subscription
- Delivery guarantees
- Dead letter handling

## Authority
- Spec MET-EVE-001: Event immutability
- Spec MET-EVE-002: Outbox pattern

## Prerequisites
- PostgreSQL

## Specification Requirements
- Outbox pattern for event emission (MET-EVE-002).

## Approved Architecture
- **Delivery Guarantee**: At-least-once delivery for domain events.
- **Replay**: System must support event replay from a specific point in time.
- **Dead Letter Handling**: Failed events are moved to a dead letter queue after max retries.
- **Tenant Isolation**: Event processing workers respect tenant boundaries.

## Implementation Contract
1. Implement the Outbox pattern: write events to an `OutboxEvent` table in the same transaction as the mutation.
2. A background relayer sweeps the `OutboxEvent` table and publishes to subscribers or a message broker.
3. Subscribers register handlers for specific event types.

## Constraints & Invariants
- INV-001: Strict Tenancy Isolation. Events must carry the `tenantId`.
- INV-002: Read-Only Closed States.

## Dependencies
- Database Transactions

## Failure Modes
- Relayer failure - Stops publishing, builds up outbox, resumes safely upon restart.
- Subscriber failure - Retries via backoff, then moves to DLQ.

## Testing Requirements
- Verify outbox transactionality.
- Verify at-least-once delivery.

## Conformance Checks
- Verify MET-EVE-002 outbox compliance.

## Traceability
- MET-EVE-001, MET-EVE-002

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Choice of internal message broker or just direct database polling for the relayer.
