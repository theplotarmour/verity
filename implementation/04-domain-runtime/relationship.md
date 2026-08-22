# Purpose
Defines the rules for foreign keys, relationships, and aggregate boundaries within the domain.

# Scope
Covers Aggregate Roots, child tables, required/optional FKs, self-referencing relationships, and cross-tenant constraints.

# Authority
- Bible Synthesis ADOPTED: Frappe child tables
- Spec PLA-TEN-003: Cross-Tenant Data Access

# Prerequisites
- Base Entity Pattern (`entity.md`)

# Specification Requirements
- PLA-TEN-003: Cross-Tenant Data Access is strictly prohibited. Records must never reference records from another tenant.

# Approved Architecture
- **Child Tables / Aggregate Boundaries**: Frappe child tables (Authority: Bible Synthesis ADOPTED).
  - Sub-entities (e.g., ChecklistItem, Evidence) are Aggregate Children.
  - Children mutated ONLY through parent Aggregate Root.
  - Parent delete cascades to children.
  - Children have no independent lifecycle.

# Implementation Contract
- **Required FKs**: Every entity MUST have a `tenant_id` FK to Organization (except Organization itself). Parent entity references for children MUST be required.
- **Optional FKs**: Nullable references to optional associations.
- **Self-referencing FKs**: Use for hierarchies, e.g., Organization `parent_id`.
- **Cross-Tenant FK Prohibition (PLA-TEN-003)**: Application logic and DB constraints (where possible) MUST ensure that `record.tenant_id == referenced_record.tenant_id`.
- Mutations to a `ChecklistItem` MUST be done via a `WorkOrder` command, never via a dedicated `ChecklistItem` endpoint.

# Constraints & Invariants
- INV-001: Strict Tenancy Isolation.
- Cross-Tenant FK Prohibition: NEVER reference records from another tenant.

# Dependencies
- Depends on: Prisma schema relations.

# Failure Modes
- Cross-tenant reference attempt throws `E_FORBIDDEN`.
- Orphaned child records prevented by `onDelete: Cascade`.

# Testing Requirements
- Attempting to link records from different tenants MUST fail.
- Deleting an Aggregate Root MUST delete all its child entities.

# Conformance Checks
- Integration tests for tenant isolation on relationships.

# Traceability
- PLA-TEN-003

# Open Decisions
- None
