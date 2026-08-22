# Purpose
Defines concrete invariant checks to ensure the implementation adheres to constitutional and architectural rules.

# Scope
Legacy names, tenancy, commands, authorization, audit, capability boundaries, DB mutations.

# Authority
- Authority: Bible V1-5
- Authority: Constitution (INV-001, INV-002, INV-003)

# Prerequisites
- Codebase.

# Specification Requirements
- WHAT MUST EXIST: Verifiable methods for all invariants.

# Approved Architecture
- CI Scripts and static analysis.

# Implementation Contract
- **CONCRETE INVARIANT CHECKS:**
  1. **Forbidden legacy names:** grep for all VEDA patterns (see `forbidden-patterns.md`).
  2. **Tenancy isolation:** every model has `tenant_id`, every query uses `withTenant()` wrapper. Violation: missing `tenant_id` on new Prisma model. Fix: add it and backfill.
  3. **Command boundary:** every mutation goes through `defineCommand()`. No direct `prisma.entity.create()` outside commands. Violation: calling Prisma mutate in API route directly. Fix: wrap in command.
  4. **Authorization:** every command includes `MET-ACT-002` authorization check.
  5. **Event/audit rules:** every command emits events (`MET-ACT-004`). Audit tables reject UPDATE/DELETE via DB triggers.
  6. **Capability boundaries:** no undeclared cross-capability imports. Check import graph (`madge` or ESLint).
  7. **No direct DB mutation:** no raw SQL bypassing command pipeline (except migrations/RLS).
  8. **No undocumented mutation:** every platform-level change has a corresponding spec requirement.

# Constraints & Invariants
- Constitutional invariants are unbreakable.

# Dependencies
- Linting tools, DB migration scripts.

# Failure Modes
- Developers bypassing commands for speed. Caught by Check #3.

# Testing Requirements
- Enforced via ESLint rules and CI shell scripts.

# Conformance Checks
- CI failure on violation.

# Traceability
- INV-001, INV-002, INV-003, MET-ACT, EXE-AUD

# Open Decisions
- IMPLEMENTATION DECISION REQUIRED: ESLint configuration for boundary enforcement vs custom AST scripts.
