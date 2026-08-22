# Webhooks

## Purpose
This document defines how the platform pushes event-driven notifications to external systems securely and reliably.

## Scope
**In Scope:** Outbound webhooks, retries, signature verification.
**Out of Scope:** Inbound webhooks from third parties.

## Authority
- Spec MET-EVE-001→002

## Prerequisites
- Domain events system (Outbox) operational.

## Specification Requirements
- External systems must be able to subscribe to platform events.

## Approved Architecture
- Event-driven webhook dispatcher consuming from the platform outbox.

## Implementation Contract
- **Outbound webhook delivery:** External consumers can subscribe to events.
- **Webhook registration per tenant:** Tenants configure their own endpoints.
- **Retry with exponential backoff:** Failed deliveries must be retried.
- **Signature verification (HMAC):** All outbound requests must be signed using a tenant-specific secret so the receiver can verify authenticity.
- **Payload format:** Derived directly from domain events. Must include event type, timestamp, tenant ID, and payload.

## Constraints & Invariants
- Webhook delivery must not block the main transaction thread (must be asynchronous).

## Dependencies
- Domain events infrastructure.

## Failure Modes
- Slow endpoints cause worker starvation if timeouts aren't enforced.
- Missing signatures compromise external system security.

## Testing Requirements
- Mock endpoints must be used to test retry logic and signature generation.

## Conformance Checks
- Payload schema validation.

## Traceability
- MET-EVE-001→002

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Should Inngest be used for the webhook delivery queue, or a custom background worker?
