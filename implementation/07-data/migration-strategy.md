# Migration Strategy

## Purpose
Defines how database schema changes are managed and deployed.

## Scope
- Prisma Migrate
- RLS migrations
- Audit triggers

## Authority
- Bible V1: Prisma
- Spec EXE-AUD-003: Audit immutability

## Prerequisites
- Schema Construction

## Specification Requirements
- Audit tables must reject modifications (EXE-AUD-003).

## Approved Architecture
- **Tooling**: Prisma Migrate for schema changes.
- **Naming**: Standard migration naming convention.
- **Direction**: Forward-only migrations (no down migrations in production).
- **RLS & Audit**: RLS policy migrations and audit table constraints (UPDATE/DELETE rejection triggers) applied via raw SQL in migration files.

## Implementation Contract
1. Use `prisma migrate dev` for local development.
2. Edit generated `.sql` files to inject raw SQL for RLS policies and audit triggers.
3. Set up a raw SQL script for `EXE-AUD-003` triggers.

## Constraints & Invariants
- EXE-AUD-003: audit tables reject UPDATE/DELETE.

## Dependencies
- Database Bootstrap

## Failure Modes
- Failed migration - Requires manual intervention / forward fix.

## Testing Requirements
- Verify migration applies cleanly on empty and populated databases.

## Conformance Checks
- EXE-AUD-003

## Traceability
- EXE-AUD-003

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: None.
