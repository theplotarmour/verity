# API Contracts

## Purpose
This document defines the standard for API communication, error handling, and data exchange for Verity platform integrations and client applications.

## Scope
**In Scope:** REST API patterns, Server Actions, error formats, authentication.
**Out of Scope:** GraphQL or gRPC (not adopted).

## Authority
- EXISTING INFRASTRUCTURE (Next.js 16 + React 19, Supabase Auth)
- Bible V5

## Prerequisites
- Next.js API routes / Server Actions configured.

## Specification Requirements
- Consistent error formatting and secure communication.

## Approved Architecture
- Next.js Server Actions for internal UI consumption.
- REST endpoints for external integrations.
- Bearer JWT token authentication via Supabase Auth.

## Implementation Contract

- **REST API patterns:** Use standard HTTP verbs (GET, POST, PUT, DELETE). Alternatively, use Server Actions for internal Next.js use.
- **Error response format:** All API errors MUST return the following JSON structure:
  ```json
  {
    "code": "STRING_ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
  ```
- **Pagination format:** IMPLEMENTATION DECISION REQUIRED (choose between cursor-based or offset-based pagination).
- **Authentication:** Bearer JWT token (Authority: EXISTING INFRASTRUCTURE).
- **Rate limiting:** IMPLEMENTATION DECISION REQUIRED (infrastructure mapping for rate limiting).
- **API versioning strategy:** IMPLEMENTATION DECISION REQUIRED (URL path vs headers).

## Constraints & Invariants
- API must always enforce tenant context (INV-001).

## Dependencies
- Supabase Auth.

## Failure Modes
- Inconsistent error formats break client applications.
- Missing rate limiting leads to abuse.

## Testing Requirements
- API integration tests must cover success, validation errors, and unauthorized access.

## Conformance Checks
- API responses must be validated against a unified Zod schema.

## Traceability
- INV-001

## Open Decisions
- Pagination strategy (cursor vs offset).
- Rate limiting strategy.
- API versioning strategy.
