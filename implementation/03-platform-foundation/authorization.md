# Purpose
Defines the authorization engine for evaluating user capabilities.

# Scope
- Role resolution
- Permission evaluation (Verb + Entity + Scope)
- UI and Command gating

# Authority
- **Bible Synthesis ADOPTED**: Keycloak composite roles (parent/child self-reference → flat runtime permission bits)
- **Bible Synthesis REJECTED**: Coarse-grained flat RBAC
- **Spec MET-ACT-002**: Permission checks at command execution

# Prerequisites
- Membership module.

# Specification Requirements
- **MET-ACT-002**: Commands MUST strictly enforce authorization checks before execution.
- System must support row-level territory/branch scoping.

# Approved Architecture
- **Keycloak Composite Roles**: Roles have parent/child self-reference inheritance. At runtime, these resolve to a flat set of permission bits (Authority: Bible Synthesis ADOPTED).
- **Permission Model**: Structured as `Verb` + `Entity` + `Scope` (e.g., `update:work_order:organization`).
- **Scope Levels**: `own` (user's own data), `organization` (branch/territory level), `tenant` (global).

# Implementation Contract
1. Data Model: `Role`, `RoleInheritance` (self-referencing), `Permission`.
2. Implement a `resolvePermissions(roleId)` function that walks the inheritance tree and flattens permissions. Cache the result aggressively.
3. Command Execution: All commands MUST execute an `authorize(userContext, requiredPermission, targetEntity)` check.
4. UI gating: Expose a `hasPermission()` hook/utility to the React frontend to hide/disable actions the user cannot perform.

# Constraints & Invariants
- No command can modify state without a passing authorization check.

# Dependencies
- Depends on: Membership, Capability Registry.

# Failure Modes
- Inheritance cycles. A mechanism must prevent cyclical role inheritance on write.

# Testing Requirements
- Test role flattening logic (composite to flat bits).
- UI permission gating unit tests.

# Conformance Checks
- Enforce MET-ACT-002 via static analysis or strict middleware boundaries.

# Traceability
- Covers: MET-ACT-002.

# Open Decisions
- None.
