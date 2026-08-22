# Observability

## Purpose
This document defines the metrics, logging, and tracing infrastructure to maintain visibility into the platform's runtime behavior.

## Scope
**In Scope:** Logging formats, error tracking, product analytics, request tracing.
**Out of Scope:** System-level OS monitoring.

## Authority
- EXISTING INFRASTRUCTURE (Sentry, PostHog)
- Spec GOV-TER-016 (Logs) and GOV-TER-015 (Business Events)

## Prerequisites
- Application environment configured.

## Specification Requirements
- Clear distinction between developer logs and business audit events.

## Approved Architecture
- Structured JSON logging, external error tracking, and analytics aggregation.

## Implementation Contract
- **Structured logging:** All application logs must be in JSON format to support efficient parsing.
- **Error tracking:** Use Sentry for unhandled exceptions and front-end errors (Authority: EXISTING INFRASTRUCTURE).
- **Product analytics:** Use PostHog for user behavior and telemetry (Authority: EXISTING INFRASTRUCTURE).
- **Log vs Business Event Distinction:** Log is developer-facing, never mixed with Business Events. (GOV-TER-016, GOV-TER-015).
- **Request tracing:** Implement correlation IDs passed across the request lifecycle to trace operations.
- **Metric collection:** IMPLEMENTATION DECISION REQUIRED for specific metrics infrastructure (e.g., Prometheus, Datadog).

## Constraints & Invariants
- PII and sensitive data must be redacted from logs before transmission.

## Dependencies
- Sentry SDK, PostHog SDK.

## Failure Modes
- Log spam consumes disk space/bandwidth.
- Missing correlation IDs make distributed debugging impossible.

## Testing Requirements
- Verify correlation ID propagation in integration tests.

## Conformance Checks
- Ensure logger wrapper redacts sensitive fields.

## Traceability
- GOV-TER-015
- GOV-TER-016

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Metrics collection infrastructure.
