# Purpose
Defines patterns for read-only views, projections, and analytical data aggregations in Verity.

# Scope
Covers dashboard metrics, computed views, and synchronization of materialized projections.

# Authority
- IMPLEMENTATION DECISION REQUIRED (Materialization vs Computation on Read)

# Prerequisites
- Query Pipeline (`query.md`)
- Event System (`event.md`)

# Specification Requirements
- Read-only views must adhere to tenant isolation (PLA-TEN-002).

# Approved Architecture
- **IMPLEMENTATION DECISION REQUIRED**: Should projections be materialized asynchronously via Event handlers, or computed dynamically on read using SQL views/Prisma aggregations?

# Implementation Contract
- **Projections**: Read-only views computed from one or more entities.
- **Dashboard Data**: Aggregated metrics and KPIs MUST enforce tenant isolation.
- **Sync**: If materialized, projection updates occur by subscribing to domain events (e.g., `work.work_order.completed`) and updating a separate projection table.

# Constraints & Invariants
- Projections are READ-ONLY. They cannot be modified via standard commands.
- Strict Tenancy Isolation (INV-001) applies to all projections.

# Dependencies
- Depends on: Domain Events (if materialized), Prisma (if computed).

# Failure Modes
- Materialized projections falling out of sync due to event processing failures.

# Testing Requirements
- Verify projection data exactly matches the source of truth entities.
- Verify tenant isolation on projection queries.

# Conformance Checks
- Ensure projection tables have no direct update/mutation endpoints.

# Traceability
- PLA-TEN-002

# Open Decisions
- **IMPLEMENTATION DECISION REQUIRED**: Strategy for materialized vs computed projections.
