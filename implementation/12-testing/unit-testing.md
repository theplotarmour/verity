# Purpose
Defines the unit testing strategy, focusing on fast, isolated execution of pure logic.

# Scope
Command logic, state machine guards, validation rules, computation rules, and utility functions.

# Authority
- Authority: EXISTING INFRASTRUCTURE (Vitest 4.1.10)
- Authority: Bible Synthesis, ADOPTED/ADAPTED (Zod for validation)

# Prerequisites
- Vitest configured.
- Mocking framework (vi) available.

# Specification Requirements
- WHAT MUST EXIST: Isolated tests for all business logic, particularly state transitions and capability guards.

# Approved Architecture
- **Mocking Strategy:** Mock Prisma client (`vitest-mock-extended` or similar).
- **No DB Access:** Unit tests must execute entirely in memory.

# Implementation Contract
- **Commands:** Test validation logic and expected output given mocked DB responses.
- **State Machines:** Test transition logic, testing every valid and invalid guard condition.
- **Queries:** Test query builders without executing them.

# Constraints & Invariants
- NO database access allowed in this layer.
- INV-002: Read-Only Closed States must be tested by mocking state objects and asserting guards throw errors.

# Dependencies
- Depends on `test-pyramid.md`.

# Failure Modes
- Over-mocking leading to false positives: Ensure integration tests cover the critical paths.

# Testing Requirements
- Assert against Zod schemas for expected payloads.

# Conformance Checks
- Ensure test files do not import real Prisma instances.

# Traceability
- MET-ACT-001→004 (Command pipeline testing)

# Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Specific mock data generation library (e.g., faker vs hardcoded fixtures).
