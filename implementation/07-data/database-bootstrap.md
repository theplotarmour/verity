# Database Bootstrap

## Purpose
Defines the baseline database technology, connection patterns, and RLS rules.

## Scope
- RLS Policies
- Prisma configuration
- Connection pooling

## Authority
- Bible V1: PostgreSQL + Prisma (System of Record)
- Bible V5: RLS
- EXISTING INFRASTRUCTURE: Supabase-hosted PostgreSQL
- Spec PLA-TEN-001→002

## Prerequisites
- PostgreSQL instance

## Specification Requirements
- Tenant-isolated persistent storage (PLA-TEN-001)

## Approved Architecture
- **Database**: PostgreSQL (Authority: Bible V1).
- **ORM**: Prisma (Authority: Bible V1).
- **Hosting**: Supabase-hosted PostgreSQL (Authority: EXISTING INFRASTRUCTURE).
- **Connections**:
  - Pooled connection via Supabase pooler for application queries (Authority: EXISTING INFRASTRUCTURE).
  - Direct connection for migrations (Authority: EXISTING INFRASTRUCTURE).
- **RLS Policies**: Create PostgreSQL Row Level Security policies on all tenant-scoped tables (Authority: Bible V5 + PLA-TEN-001→002).
  - Policy pattern: `tenant_id = current_setting('verity.tenant_id')::uuid`
- **Prisma Features**: Use `relationJoins` preview feature (Authority: EXISTING INFRASTRUCTURE).

## Implementation Contract
1. Initialize Prisma schema with `relationJoins` preview feature.
2. Define a base SQL script for enabling RLS and setting up the `current_setting` mechanism.
3. specific ports/URLs are infrastructure details documented in 16-environment/env-contract.md.

## Constraints & Invariants
- INV-001: Strict Tenancy Isolation.

## Dependencies
- Schema Construction

## Failure Modes
- Missing RLS policy - Prevented by CI checks.

## Testing Requirements
- Verify RLS blocks cross-tenant reads.

## Conformance Checks
- PLA-TEN-001

## Traceability
- PLA-TEN-001, PLA-TEN-002

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: None.
