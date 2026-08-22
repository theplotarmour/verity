# Schema Construction

## Purpose
Defines the rules for building the Prisma schema and database tables.

## Scope
- Naming conventions
- Base fields
- Relations
- Custom fields

## Authority
- Bible V1: Prisma
- Spec PLA-EXT-001: Extensions
- Spec GOV-TER: Terminology

## Prerequisites
- Database Bootstrap

## Specification Requirements
- Extensibility via custom fields (PLA-EXT-001).

## Approved Architecture
- **Naming**: `snake_case` tables, `PascalCase` Prisma models matching GOV-TER canonical terms. No `@@map` to VEDA names (forbidden pattern).
- **Base Fields**: `id`, `tenantId`, `createdAt`, `updatedAt`, `version`, `customFields`.
- **Relations**: 1:1, 1:N, N:M through join tables.
- **Enums**: Enum definitions matching spec state definitions.
- **Custom Fields**: `Json` type for `custom_fields` column (PLA-EXT-001).

## Implementation Contract
1. Scaffold Prisma models for core entities (Party, Location, Work, Resource, etc.).
2. Ensure no VEDA legacy terminology is used (e.g., job_card, client_obj).

## Constraints & Invariants
- INV-003: Unified Party Identity.
- No undeclared direct dependency between capabilities.

## Dependencies
- Terminology Glossary

## Failure Modes
- Schema drift - Managed by Prisma Migrate.

## Testing Requirements
- Unit test Prisma client generation.

## Conformance Checks
- Verify compliance with GOV-TER canonical names.

## Traceability
- PLA-EXT-001

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: None.
