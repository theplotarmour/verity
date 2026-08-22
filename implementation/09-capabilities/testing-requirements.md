# Testing Requirements

## Purpose
This document establishes the minimum testing standards for any capability implemented in the Verity platform.

## Scope
**In Scope:** Unit, Integration, Authorization, Tenancy, State Machine, and Offline tests.
**Out of Scope:** End-to-end (E2E) browser testing framework selection (defaults to Playwright).

## Authority
- Bible V1
- EXISTING INFRASTRUCTURE (Vitest + Playwright)

## Prerequisites
- Testing frameworks configured.

## Specification Requirements
- All capabilities must have extensive automated test coverage ensuring isolation and authorization.

## Approved Architecture
- Unit tests via Vitest.
- E2E / API integration tests via Vitest/Playwright.

## Implementation Contract

### MINIMUM TEST REQUIREMENTS per capability:
- **Unit tests:** Command logic, state machine guards, validation rules.
- **Integration tests:** Database operations, transaction boundaries, tenant isolation.
- **Authorization tests:** Verify permission matrix for every command (does an unauthorized user get rejected?).
- **Tenancy tests:** Verify cross-tenant isolation. Create records in Tenant A, ensure they are invisible from Tenant B.
- **State machine tests:** Every valid and invalid transition must be tested.
- **Offline tests (where applicable):** Command generation, background sync, conflict resolution.

### Conventions
- **Test naming convention:** Use descriptive block names (`describe('Command: [Name]')`).
- **Test data setup:** Use factories to generate valid state, avoid raw SQL inserts.
- **Tenant isolation testing pattern:** Strict requirement for multi-tenant data verification in test assertions.

## Constraints & Invariants
- INV-001: Strict Tenancy Isolation must be demonstrably tested in every capability.

## Dependencies
- Test factory utilities.

## Failure Modes
- Lack of authorization tests leads to privilege escalation.
- Lack of tenancy tests leads to data leakage.

## Testing Requirements
- Tests must execute successfully on every CI run.

## Conformance Checks
- Code coverage minimums enforced by CI.

## Traceability
- INV-001

## Open Decisions
- NONE.
