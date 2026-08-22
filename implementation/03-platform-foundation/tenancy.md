# Purpose
This document defines the implementation strategy and execution contract for Tenant Isolation in the Verity platform.

# Scope
- Row-Level Security (RLS) enforcement mechanisms in PostgreSQL
- Transaction-scoped tenant context initialization via Prisma
- Secure tenant context derivation from authenticated session data

# Authority
- **Bible V5**: Logical Row-Level Security partition
- **Bible V5**: Global single-realm authentication with group-scoped memberships
- **Spec PLA-TEN-001→006**: Tenancy Requirements
- **EXISTING INFRASTRUCTURE**: Supabase Auth (@supabase/ssr), SET LOCAL transaction pattern
- **Bible V1**: PostgreSQL, Prisma

# Prerequisites
- PostgreSQL database provisioned
- Prisma 6.12.0 setup
- Supabase Auth integration functioning

# Specification Requirements
- **PLA-TEN-001 (Global Tenant Filter)**: Every table partitioned by `tenant_id`.
- **PLA-TEN-002 (Query Middleware Isolation)**: Auto-inject `WHERE tenant_id`.
- **PLA-TEN-003 (Cross-Tenant FK Prohibition)**: No foreign keys across boundaries. 
- **PLA-TEN-004 (Logical Sharing / Multi-Tenant Schema)**: Shared DB, row-level filters.
- **PLA-TEN-005 (Physical Sharding / Enterprise Separation)**: Isolatable to dedicated DB without code changes.
- **PLA-TEN-006 (Secure Context Derivation Invariant)**: Tenant from auth token, not client payload.

# Approved Architecture
- **RLS Enforcement Mechanism**: PostgreSQL Row-Level Security policies (Authority: Bible V5).
- **Transaction-scoped Context**: Use `SET LOCAL` pattern within Prisma (Authority: EXISTING INFRASTRUCTURE).
- **Session Context**: Active `tenant_id` derived strictly from Supabase Auth JWT (Authority: EXISTING INFRASTRUCTURE, PLA-TEN-006).

# Implementation Contract
1. Every Prisma model belonging to a tenant MUST include a `tenant_id` field.
2. Implement `withTenant(tenantId, callback)` wrapper.
3. Within `withTenant`, execute `await tx.$executeRawUnsafe('SET LOCAL rls.tenant_id = $1', tenantId)`.
4. RLS policies created via raw SQL migrations.
5. Resolve `tenantId` from Supabase Auth session at request boundary.
6. No direct Prisma queries outside `withTenant` wrapper (except tenant management).

# Constraints & Invariants
- **INV-001 (Strict Tenancy Isolation)**

# Dependencies
- Depends on: Identity (Supabase Auth).

# Failure Modes
- **Missing Context**: RLS blocks query, handled via 500/403.

# Testing Requirements
- Cross-tenant isolation smoke test, tenant context derivation test, RLS policy verification.

# Conformance Checks
- CI check confirming `tenant_id` on tenant models.

# Traceability
- Covers: PLA-TEN-001→006.

# Open Decisions
- **IMPLEMENTATION DECISION REQUIRED**: *Enterprise Sharding (PLA-TEN-005)* mechanism for dedicated DB routing.
