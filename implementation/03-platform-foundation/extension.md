# Purpose
Defines the execution of lifecycle hooks and structural extensions within the platform.

# Scope
- Command lifecycle hooks (`before_validate`, `before_save`, `after_save`, `before_transition`)
- Sub-entity modeling via child tables

# Authority
- **Spec PLA-EXT-004**: Lifecycle Execution Hooks
- **Spec PLA-EXT-001**: Extensions Column
- **Bible Synthesis ADOPTED**: Frappe child tables pattern for sub-entities

# Prerequisites
- Metadata Runtime (for validation).

# Specification Requirements
- **PLA-EXT-004**: The system must execute registered logic at strict points in the data lifecycle.

# Approved Architecture
- **Lifecycle Hooks**: Hook execution is governed by the Command pipeline.
- **Child Tables Pattern**: Complex nested extensions that cannot fit in a flat JSONB `custom_fields` utilize the "Frappe child tables pattern" (Authority: Bible Synthesis ADOPTED), maintaining strongly typed relational integrity for sub-entities.

# Implementation Contract
1. The Command Bus MUST expose registration points for:
   - `before_validate` (modifying payload, dynamic Zod validation)
   - `before_save` (enrichment, default calculations)
   - `after_save` (emitting domain events, triggering async side-effects)
   - `before_transition` (state machine guard rails)
2. Hook execution is synchronous (except `after_save` side effects) and MUST run within the database transaction. Throwing an error in a `before_*` hook rolls back the transaction.
3. Capabilities register their hooks via the Capability Registry.

# Constraints & Invariants
- **INV-002 (Read-Only Closed States)**: Hooks MUST NOT modify entities that are in a terminal/closed state.

# Dependencies
- Depends on: Capability Registry, Prisma Interactive Transactions.

# Failure Modes
- Unhandled hook exceptions. The Command pipeline MUST catch hook errors and wrap them in standard platform error responses without crashing the process.

# Testing Requirements
- Transaction rollback test: Ensure throwing in `before_save` prevents DB persistence.

# Conformance Checks
- Ensure all hooks are executed sequentially and predictably.

# Traceability
- Covers: PLA-EXT-001, PLA-EXT-004.
- Adheres to: INV-002.

# Open Decisions
- None.
