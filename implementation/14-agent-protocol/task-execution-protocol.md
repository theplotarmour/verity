# Task Execution Protocol

## Purpose
Defines the strict operational loop Claude must follow to pick up, implement, verify, and complete a task.

## Scope
In scope: Task identification, dependency verification, coding loop, testing, conformance, self-review, and commit.
Out of scope: Handoffs between entirely different sessions (see `session-continuity.md`).

## Authority
- Authority: Bible V2, Platform Constitution
- Authority: Bible Synthesis, ADOPTED

## Prerequisites
- Context loaded per `context-loading-order.md`.
- Task list or build order is accessible.

## Specification Requirements
- WHAT MUST EXIST: A reproducible, tracable mechanism to go from a Spec Requirement ID to committed, verified code.

## Approved Architecture
- HOW IT SHOULD BE IMPLEMENTED: A structured linear loop with strict gates that prevent commits if invariants fail.

## Implementation Contract
HOW CLAUDE SHOULD EXECUTE:
1. **Task identification**: Select the next task from the build order or active milestone.
2. **Dependency verification**: Confirm all prerequisites (capabilities, DB schema) exist and pass their own tests. No undeclared direct dependency between capabilities.
3. **Requirement extraction**: Identify all Spec Requirement IDs for the task (e.g., PLA-TEN-001, MET-ACT-002).
4. **Implementation**: Write code adhering to domain runtime patterns. Use PostgreSQL/Prisma (System of Record - Authority: Bible V1).
5. **Testing**: Write unit/integration tests leveraging Vitest.
6. **Conformance**: Run forbidden pattern checks, ensure GOV-TER glossary alignment, run invariant checks.
7. **Self-review**: Execute `self-review-checklist.md`.
8. **Commit**: Create a structured commit message including all addressed Requirement IDs.
9. **Post-commit**: Update traceability matrix and implementation journal.

## Constraints & Invariants
- Code cannot be committed without an associated Spec Requirement ID.
- Dependencies between capabilities must be explicitly declared contracts, platform services, or domain events.

## Dependencies
- Depends on `self-review-checklist.md` and `forbidden-patterns-register.md`.

## Failure Modes
- If dependencies are missing, pause implementation, record the block, and pivot to the missing dependency if authorized.

## Testing Requirements
- All tasks must include unit tests. No coverage regressions permitted for business logic.

## Conformance Checks
- Code must pass invariant static analysis checks before commit.

## Traceability
- PLA-TEN-001→006, MET-ACT-001→004, EXE-AUD-001→003

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Which specific static analysis tool enforces capability boundaries (e.g., ESLint boundary rules).
