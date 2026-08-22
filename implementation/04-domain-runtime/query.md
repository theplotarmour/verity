# Purpose
Defines the read path implementation for querying domain entities in Verity.

# Scope
Covers tenant filtering, single record lookup, list filtering/pagination/sorting, and analytical query sandboxing.

# Authority
- Spec PLA-TEN-002: Tenant Isolation in Queries
- Bible Synthesis ADAPTED: AST query sandboxing from Metabase

# Prerequisites
- PostgreSQL & Prisma

# Specification Requirements
- PLA-TEN-002: Every query MUST include tenant filtering.

# Approved Architecture
- **Query Engine**: Prisma (Authority: Bible V1)
- **Analytical Sandboxing**: AST query sandboxing (Authority: Bible Synthesis ADAPTED - Metabase)

# Implementation Contract
- **Tenant Filtering**: Every `findUnique`, `findFirst`, `findMany`, or `count` operation MUST inject `tenant_id: ctx.tenantId` into the Prisma `where` clause.
- **Standard Query Patterns**:
  - `getById(id, tenantId)`
  - `findMany(filters, pagination, sort, tenantId)`
  - `count(filters, tenantId)`
- **AST Query Sandboxing**: For custom analytics, the frontend sends queries as a JSON AST. The backend translates this AST to SQL/Prisma, *forcing* the `tenant_id` filter into the root of the query before execution to prevent tenant bypass.
- **Pagination**: Offset-based or Cursor-based (IMPLEMENTATION DECISION REQUIRED).

# Constraints & Invariants
- INV-001: Strict Tenancy Isolation. A read operation MUST NEVER return data outside the actor's tenant context.

# Dependencies
- Depends on: Prisma, Tenant Context

# Failure Modes
- Querying an ID belonging to another tenant returns `NotFound` or empty list.

# Testing Requirements
- Unit tests verifying `tenant_id` is always appended to the `where` clause.
- AST parser tests ensuring malicious JSON cannot bypass the tenant filter.

# Conformance Checks
- Code review / linting for manual Prisma calls missing `tenant_id`.

# Traceability
- PLA-TEN-002

# Open Decisions
- **IMPLEMENTATION DECISION REQUIRED**: Pagination strategy (cursor-based vs offset-based).
