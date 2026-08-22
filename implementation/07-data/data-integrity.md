# Data Integrity

## Purpose
Defines constraints and rules enforced at the database level.

## Scope
- Foreign Keys
- Unique Constraints
- Check Constraints

## Authority
- Spec PLA-TEN-003: Cross-tenant restriction
- Spec EXE-AUD-003: Audit append-only

## Prerequisites
- Schema Construction

## Specification Requirements
- No cross-tenant FKs (PLA-TEN-003).

## Approved Architecture
- **Foreign Keys**: Enforced at database level.
- **Unique Constraints**: Entity-specific from spec.
- **Check Constraints**: Where applicable (e.g., positive amounts).
- **INV-001**: `tenant_id` FK to Tenant on every operational table.
- **INV-003**: Party uniqueness within tenant.
- **PLA-TEN-003**: no cross-tenant FKs.
- **EXE-AUD-003**: audit tables reject UPDATE/DELETE.

## Implementation Contract
1. Define composite unique keys in Prisma including `tenantId` where appropriate (e.g., Party email/tenantId).
2. Write raw SQL migrations for check constraints and audit triggers.

## Constraints & Invariants
- INV-001, INV-003, PLA-TEN-003.

## Dependencies
- Migration Strategy

## Failure Modes
- Constraint violation - Throws database error, mapped to standard domain error.

## Testing Requirements
- Test cross-tenant reference rejection.
- Test audit update rejection.

## Conformance Checks
- PLA-TEN-003, EXE-AUD-003.

## Traceability
- PLA-TEN-003, EXE-AUD-003

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: None.
