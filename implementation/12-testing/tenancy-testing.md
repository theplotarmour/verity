# Purpose
Validates strict multi-tenant data isolation.

# Scope
Database Row Level Security (RLS), application layer tenant filtering, cross-tenant constraints.

# Authority
- Authority: Spec PLA-TEN-001→006
- Authority: Bible V5 + Spec PLA-TEN-001→002 (RLS)

# Prerequisites
- PostgreSQL with RLS enabled.

# Specification Requirements
- WHAT MUST EXIST: Tests proving data from Tenant A is strictly invisible and inaccessible to Tenant B.

# Approved Architecture
- Vitest integration tests leveraging PostgreSQL RLS via Prisma Client Extensions or raw SQL validation.

# Implementation Contract
- Create data in Tenant A, switch context to Tenant B, verify zero visibility.
- Attempt RLS policy bypasses and assert failure.
- PLA-TEN-003: Verify cross-tenant FK creation explicitly fails at the DB level.
- PLA-TEN-006: Verify client-supplied `tenant_id` payloads are ignored/override by the server's auth context.

# Constraints & Invariants
- INV-001: Strict Tenancy Isolation.

# Dependencies
- Depends on PostgreSQL RLS setup.

# Failure Modes
- Application layer forgetting to append tenant_id: Caught by DB RLS rejecting the insert/select.

# Testing Requirements
- Explicit cross-tenant access denial tests for all core entities.

# Conformance Checks
- DB schema validation for `tenant_id` presence on all tenant-scoped tables.

# Traceability
- PLA-TEN-001→006

# Open Decisions
- None. Required by Constitution.
