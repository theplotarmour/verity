# Resilience

## Purpose
This document establishes patterns to ensure the platform remains available despite partial failures of dependencies or excessive load.

## Scope
**In Scope:** Circuit breakers, rate limiting, fallbacks, degradation.
**Out of Scope:** Infrastructure redundancy (managed by cloud provider).

## Authority
- Bible V5

## Prerequisites
- Integration boundaries defined.

## Specification Requirements
- Failures in external systems or secondary capabilities must not crash core business transactions.

## Approved Architecture
- Defense-in-depth API boundaries and asynchronous processing.

## Implementation Contract
- **Graceful degradation:** When external services fail, the application must degrade gracefully (e.g., disable specific UI features rather than crashing).
- **Circuit breaker pattern:** IMPLEMENTATION DECISION REQUIRED for specific implementation library or logic to wrap external calls.
- **Rate limiting:** Apply rate limiting at the API boundary to prevent noisy neighbor problems and brute force attacks.
- **Timeout configuration:** Strict timeouts for all external calls.
- **Fallback behavior:** Define fallback behavior for non-critical features (e.g., if the notification service is down, queue the notification and proceed).

## Constraints & Invariants
- Core mutations must never hang indefinitely.

## Dependencies
- Rate limiting middleware.

## Failure Modes
- Lack of circuit breakers causes thread exhaustion when a third party is slow.

## Testing Requirements
- Chaos testing: simulate high latency on DB and external APIs to verify application response.

## Conformance Checks
- Code review to ensure external calls are wrapped in timeout logic.

## Traceability
- Bible V5

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Specific circuit breaker implementation library.
