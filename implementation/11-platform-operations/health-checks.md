# Health Checks

## Purpose
This document defines the automated probes used to determine system health and readiness for routing traffic.

## Scope
**In Scope:** Liveness, Readiness, Startup probes, external dependency checks.
**Out of Scope:** Incident response procedures.

## Authority
- Bible V5

## Prerequisites
- Application routing layer configured.

## Specification Requirements
- The application must accurately report its health to load balancers or orchestrators.

## Approved Architecture
- Dedicated health check endpoints exposing status.

## Implementation Contract
- **Liveness:** Verifies the app process is alive (e.g., responding to basic HTTP requests).
- **Readiness:** Verifies the database connection, auth service, and storage are accessible.
- **Startup:** Verifies initial migrations are complete and capability registry is fully loaded.
- **Health endpoint:** IMPLEMENTATION DECISION REQUIRED for the exact path (typically `/api/health` or `/healthz`).
- **Dependency health:** Check each external service independently and surface their status in a detailed payload (accessible only internally).

## Constraints & Invariants
- Health checks must be lightweight to prevent self-inflicted denial of service.

## Dependencies
- Database driver, external service clients.

## Failure Modes
- A heavy readiness check causes cascading timeouts during brief load spikes.
- Failing to check the DB results in a 200 OK while all app requests fail.

## Testing Requirements
- Unit test the health check logic, mocking healthy and unhealthy dependencies.

## Conformance Checks
- N/A

## Traceability
- Bible V5

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Exact health endpoint path and authorization for detailed payload.
