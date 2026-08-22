# External Boundaries

## Purpose
This document establishes the strict rules for integrating with third-party external services, ensuring the core platform remains decoupled and resilient.

## Scope
**In Scope:** Integration adapters, payment gateways, resilience patterns.
**Out of Scope:** Internal microservices.

## Authority
- Bible V5 (Decoupled boundaries)

## Prerequisites
- Defined external API contracts.

## Specification Requirements
- The core platform must not crash due to external service failures.

## Approved Architecture
- Hexagonal architecture adapters for external systems.

## Implementation Contract
- **Integration boundary rules:**
  - No domain logic in the integration layer.
  - Integrations are adapters, not core components.
  - External API failures MUST NOT crash domain operations.
  - All external calls MUST have timeouts and retries configured.
- **Payment Gateway:** IMPLEMENTATION DECISION REQUIRED (Razorpay/Stripe selection and integration strategy).
- **Decoupled Billing Boundary:** Operational execution (e.g., closing a Work Order) NEVER awaits payment gateways (Authority: Bible V5).

## Constraints & Invariants
- Core capabilities must never have synchronous dependencies on external third-party services for state mutations.

## Dependencies
- Circuit breakers, timeout utilities.

## Failure Modes
- Synchronous calls block worker threads during an external outage.

## Testing Requirements
- Simulate external service outages and verify graceful degradation.

## Conformance Checks
- Static analysis to ensure domain layers do not import from integration layers directly.

## Traceability
- Bible V5

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Specific Payment Gateway (Stripe vs Razorpay vs both).
