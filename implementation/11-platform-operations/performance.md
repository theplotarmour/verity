# Performance

## Purpose
This document defines the baseline performance expectations and optimization strategies for the Verity platform.

## Scope
**In Scope:** Database query optimization, connection pooling, response targets, client-side bundles.
**Out of Scope:** Specific physical hardware sizing.

## Authority
- EXISTING INFRASTRUCTURE (Prisma previewFeature, Connection Pooling)

## Prerequisites
- Prisma ORM configured.

## Specification Requirements
- Platform must remain responsive under load.

## Approved Architecture
- Optimized database access and Next.js front-end optimizations.

## Implementation Contract
- **Database query optimization:** Strictly avoid N+1 query patterns. Use `relationJoins` (Authority: EXISTING INFRASTRUCTURE, Prisma previewFeature).
- **Connection pooling configuration:** Manage connections via `DATABASE_POOL_LIMIT` (Authority: EXISTING INFRASTRUCTURE).
- **Response time targets:** IMPLEMENTATION DECISION REQUIRED (establish baseline p95 for API endpoints).
- **Bundle size monitoring:** Client-side JavaScript bundles must be monitored to prevent bloat.
- **Image optimization:** Use Next.js native image optimization capabilities.

## Constraints & Invariants
- Operations that process unbounded collections must be paginated.

## Dependencies
- Prisma, Next.js.

## Failure Modes
- N+1 queries degrade performance exponentially with data size.
- Connection pool exhaustion brings down the application.

## Testing Requirements
- Load testing for critical API paths.

## Conformance Checks
- CI tools to monitor Next.js bundle sizes on PRs.

## Traceability
- EXISTING INFRASTRUCTURE

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Specific response time targets (e.g., < 200ms for p95 API response).
