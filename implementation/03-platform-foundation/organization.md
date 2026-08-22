# Purpose
Defines the implementation of the hierarchical organization tree within a tenant.

# Scope
- Organization model and nested hierarchy
- Scoping of users, resources, and work to specific organizations

# Authority
- **Spec GOV-TER-010**: Organization — logical business unit, nestable hierarchy
- **Spec GOV-TER-011**: Organization nested under Tenant

# Prerequisites
- Tenancy foundation established (`tenant_id` present)

# Specification Requirements
- **GOV-TER-010**: Organization must support a nestable hierarchy representing business units.
- **GOV-TER-011**: The root of the organization hierarchy exists strictly under a single Tenant.

# Approved Architecture
- Organization entities use a self-referencing `parent_id` foreign key for hierarchical relationships (e.g., Branch → Region → HQ).
- Integrates with authorization where role assignments and data visibility are scoped to the node in the Organization tree.

# Implementation Contract
1. Create `Organization` Prisma model with `id`, `tenant_id`, `name`, `parent_id` (self-referencing FK).
2. Data records (Users, Resources, Work Orders) MUST contain an `organization_id` linking them to their context in the hierarchy.
3. Queries for organization-scoped data MUST utilize Recursive CTEs or materialized path patterns to fetch data for an organization and all its descendants.

# Constraints & Invariants
- Circular references in `parent_id` hierarchy MUST be prevented at write-time.

# Dependencies
- Depends on: Tenancy (Organization is isolated per tenant).
- Depended on by: Membership, Authorization.

# Failure Modes
- Parent deleted while children exist. Handled via standard PostgreSQL restrict or cascade deletion rules.

# Testing Requirements
- Hierarchy traversal tests.

# Conformance Checks
- Prevent self-assignment of `parent_id`.

# Traceability
- Covers: GOV-TER-010, GOV-TER-011.

# Open Decisions
- **IMPLEMENTATION DECISION REQUIRED**: Strategy for efficient deep-tree queries (Materialized Paths, Ltree, or Recursive CTEs).
