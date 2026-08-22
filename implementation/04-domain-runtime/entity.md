# Purpose
This document defines the base entity pattern for all domain entities in Verity.

# Scope
Covers the foundational data model pattern, required system fields, and the distinction between standard entities and aggregate roots. Out of scope: specific business logic for individual domains.

# Authority
- INV-001: Strict Tenancy Isolation
- Bible V3: Optimistic concurrency via version tokens
- Spec PLA-TEN-001: Tenant Isolation
- Spec PLA-EXT-001: Extension fields
- Bible Synthesis ADOPTED: Frappe child tables
- Bible V1: PostgreSQL and Prisma

# Prerequisites
- PostgreSQL database
- Prisma 6.12.0 ORM

# Specification Requirements
- All data MUST strictly isolate by Tenant (PLA-TEN-001).
- Entities MUST support custom extension fields (PLA-EXT-001).
- Concurrent updates MUST be resolved via optimistic concurrency.
- Audit trails MUST capture creator and updater.

# Approved Architecture
- **Database Engine**: PostgreSQL (Authority: Bible V1)
- **ORM**: Prisma (Authority: Bible V1)
- **Concurrency**: Optimistic concurrency via integer `version` token (Authority: Bible V3)
- **Aggregate Roots**: Aggregate Root pattern with child tables; children mutated only through parent (Authority: Bible Synthesis ADOPTED - Frappe)

# Implementation Contract
Every domain entity MUST follow this base Prisma pattern:
```prisma
model EntityName {
  id            String   @id @default(uuid())
  tenant_id     String
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt
  version       Int      @default(1)
  custom_fields Json     @default("{}")
  created_by_id String
  updated_by_id String

  // Tenant relationship
  tenant        Organization @relation(fields: [tenant_id], references: [id])
}
```
When creating a new entity type, define whether it is an Aggregate Root or a Child Entity. Child entities MUST NOT be mutated independently of their Aggregate Root parent.

# Constraints & Invariants
- INV-001: Strict Tenancy Isolation - `tenant_id` MUST be present on all entities.
- Entities MUST never expose `id` as auto-incrementing integers; always UUID.

# Dependencies
- Depends on: Tenant capability, User capability (for audit fields).
- Depended on by: All domain capabilities.

# Failure Modes
- Concurrent modification attempts throw `E_CONFLICT`.
- Missing `tenant_id` throws validation error.

# Testing Requirements
- Verify optimistic concurrency locks.
- Verify tenant isolation in all queries.
- Verify `custom_fields` accepts arbitrary JSONB.

# Conformance Checks
- Prisma schema linting ensures base fields are present on every model.

# Traceability
- PLA-TEN-001, PLA-EXT-001, INV-001

# Open Decisions
- None
