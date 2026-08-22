# Purpose
Defines the first-run initialization sequence for the platform to ensure a consistent, safe, and ready-to-use environment.

# Scope
- Database migrations
- RLS policy application
- System defaults and seeds

# Authority
- **Platform Architecture Standards**: Idempotent bootstrapping

# Prerequisites
- Empty PostgreSQL database.
- Environment variables configured.

# Specification Requirements
- The system must automatically provision baseline data required for operation.
- Running the bootstrap sequence multiple times MUST be perfectly idempotent.

# Approved Architecture
- A unified CLI or startup script executes Prisma migrations, followed by raw SQL RLS provisioning, followed by application-level data seeding.

# Implementation Contract
1. **Sequence**:
   1. `prisma migrate deploy` (Applies schema).
   2. Execute raw SQL to apply RLS policies (must be repeatable).
   3. Seed System Tenant (if missing).
   4. Seed Superadmin User (if missing).
   5. Seed default Roles and composite Permissions.
   6. Initialize Capability Registry.
2. **Idempotency**: All seed operations MUST use `upsert` or `ON CONFLICT DO NOTHING` logic. 

# Constraints & Invariants
- The bootstrap sequence MUST NOT silently overwrite customized tenant configuration or permissions if re-run on a populated database.

# Dependencies
- Depends on: All foundational models (Tenancy, Identity, Authorization).

# Failure Modes
- Database connection failure. The bootstrap script MUST exit with a non-zero status code and clear error logs.

# Testing Requirements
- **Fresh Database Test**: Run bootstrap on an empty DB and verify successful completion.
- **Idempotency Smoke Test**: Run bootstrap twice sequentially and verify zero duplicate records and no errors.

# Conformance Checks
- Container initialization scripts must explicitly invoke the bootstrap process before accepting HTTP traffic.

# Traceability
- Foundation for operational stability.

# Open Decisions
- **IMPLEMENTATION DECISION REQUIRED**: Determine if `Inngest` (installed via EXISTING INFRASTRUCTURE) should be wired up during this bootstrap sequence for processing background seed tasks, or if all bootstrapping should remain strictly synchronous.
