# Bootstrap Sequence

## Purpose
Defines the exact first-boot sequence for the greenfield repository, establishing the minimum viable platform foundation.

## Scope
Covers Phase 0 execution, from environment validation to the first passing tenant isolation smoke test.

## Authority
- **Bible V1**: PostgreSQL + Prisma
- **Spec PLA-TEN-001→006**: Tenancy Requirements
- **Bible V5**: RLS Policies
- **EXISTING INFRASTRUCTURE**: Supabase Auth

## Prerequisites
- Clean repository.

## Specification Requirements
- Platform must have strict tenancy isolation.
- Tenant context must be derived from auth, not client payload.

## Approved Architecture
- Database: PostgreSQL with Prisma schema.
- Security: Row Level Security (RLS) policies.
- Auth integration: Supabase Auth session mapped to User entity.

## Implementation Contract

### Step-by-Step Sequence

1. **Verify Environment**
   - Verify Node.js, npm, database connection (PostgreSQL).
2. **Prisma Schema Baseline**
   - Add base models: `Tenant`, `Organization`.
   - File: `prisma/schema.prisma`
3. **Database Migration**
   - Run `npx prisma migrate dev --name init` to create initial migration.
4. **Implement RLS Policies (PLA-TEN-001→002)**
   - Add RLS SQL to Prisma migrations to enforce tenant boundaries.
5. **Implement Tenancy Context (PLA-TEN-006)**
   - Derive tenant ID from auth token securely.
6. **Implement Identity Integration**
   - Connect Supabase Auth session to User lookup mechanism.
7. **Implement Base Entity Pattern**
   - Add standard fields: `id`, `tenantId`, `createdAt`, `updatedAt`, `version`, `customFields`.
8. **Verify System**
   - Verify ability to create a tenant, authenticate, and query with tenant isolation.
9. **First Passing Test**
   - Write and pass `tenant-isolation.test.ts` (tenant isolation smoke test).

### Minimum Viable Platform (MVP)
The MVP must allow a user to authenticate, be assigned to a tenant, and execute a read query that guarantees they only see their tenant's data.

## Constraints & Invariants
- INV-001: Strict Tenancy Isolation must be verified via automated tests.

## Dependencies
- Supabase project credentials.

## Failure Modes
- RLS policy misconfiguration leading to cross-tenant data leakage.
- Auth mapping failures.

## Testing Requirements
- Automated tenant isolation tests.

## Conformance Checks
- PLA-TEN-006 check: No endpoint accepts tenantId from request body.

## Traceability
- PLA-TEN-001→006

## Open Decisions
- None.
