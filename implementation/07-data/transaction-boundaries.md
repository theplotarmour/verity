# Transaction Boundaries

## Purpose
Defines how database transactions are structured for data consistency.

## Scope
- Interactive Prisma transactions
- Tenant context setting
- Optimistic concurrency

## Authority
- Bible V5: RLS
- Bible V3: Optimistic concurrency
- Spec MET-EVE-002: Outbox

## Prerequisites
- Database Bootstrap

## Specification Requirements
- Event outbox (MET-EVE-002).

## Approved Architecture
- **Prisma Transactions**: Use Interactive Prisma transactions for command execution.
- **Tenant Context**: Set via `SET LOCAL` within the transaction (Authority: Bible V5 RLS + EXISTING INFRASTRUCTURE pattern).
- **Outbox Pattern**: Event written within same transaction as mutation (MET-EVE-002).
- **Optimistic Concurrency**: Version check within transaction (Authority: Bible V3).
- **Limits**: Transaction timeout and size limits apply. Prisma does not support nested interactive transactions.

## Implementation Contract
1. Create a transaction wrapper function that accepts the `tenantId` and executes a `SET LOCAL verity.tenant_id = ...` before yielding to the application logic.
2. Enforce version checking by appending `AND version = expected_version` to update queries.

## Constraints & Invariants
- INV-001: Strict Tenancy Isolation.

## Dependencies
- Schema Construction

## Failure Modes
- Concurrent update - Fails version check, aborts transaction.

## Testing Requirements
- Test optimistic concurrency failure.
- Test outbox write rollback on mutation failure.

## Conformance Checks
- MET-EVE-002

## Traceability
- MET-EVE-002

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Default transaction timeout.
