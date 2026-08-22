# Purpose
Defines the methodology for testing authorization, roles, and scopes.

# Scope
Command execution authorization, data visibility, and territory/branch scopes.

# Authority
- Authority: Spec PLA-TEN-001→006
- Authority: EXISTING INFRASTRUCTURE (Supabase Auth)

# Prerequisites
- Mock user contexts with varied roles/permissions.

# Specification Requirements
- WHAT MUST EXIST: Matrix testing for all commands validating that authorized roles succeed and unauthorized roles fail.

# Approved Architecture
- Vitest parameterization testing against the Command Authorization layer (MET-ACT-002).

# Implementation Contract
- For each command: `test.each` providing different user roles.
- Verify Own vs Organization vs Tenant scope rules.
- Validate Territory/branch scoping logic restricts data appropriately.

# Constraints & Invariants
- INV-003: Unified Party Identity - permissions are tied to the unified Party, not fragmented legacy identities.

# Dependencies
- Depends on Command Authorization middleware.

# Failure Modes
- Overly permissive default policies: All tests must start from a deny-all assumption.

# Testing Requirements
- Comprehensive permission matrix verification.

# Conformance Checks
- Every command must have an associated authorization test file/block.

# Traceability
- MET-ACT-002, PLA-TEN-001

# Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Tooling for automated extraction of the permission matrix from test definitions.
