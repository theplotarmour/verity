# Self-Review Checklist

## Purpose
Provides the pre-commit verification checklist every Claude session must perform to ensure code quality, invariant preservation, and architectural alignment.

## Scope
In scope: Pre-commit code checks, linting validations, architecture rules, and spec traceability.
Out of scope: Business logic validation (which is handled by tests).

## Authority
- Authority: Bible V2, Platform Constitution
- Authority: Bible Synthesis, ADOPTED

## Prerequisites
- Implementation is complete and local tests pass.
- Task execution is at the "Self-Review" stage.

## Specification Requirements
- WHAT MUST EXIST: A deterministic checklist preventing regression and invariant violation before saving state.

## Approved Architecture
- HOW IT SHOULD BE IMPLEMENTED: Automated verification where possible, semantic verification by Claude for the remainder.

## Implementation Contract
Claude MUST execute this exact checklist and confirm each item before ANY commit:

- [ ] All new files follow repository structure (`01-repository/repository-structure.md`)
- [ ] All names follow naming conventions (`01-repository/naming-conventions.md`) and GOV-TER glossary strictly.
- [ ] No forbidden patterns present (grep for `factoryId`, `Department` as production stage, automotive columns, `SystemRole` enum, etc.)
- [ ] No undeclared cross-capability imports. No undeclared direct dependency between capabilities.
- [ ] All commands follow MET-ACT-001→004 pattern.
- [ ] All events follow MET-EVE-001→002 pattern.
- [ ] All queries include tenant filtering (PLA-TEN-002) via RLS and application-level scoping.
- [ ] All entities include `tenant_id`, timestamps, and version (where applicable).
- [ ] Audit trail implemented where required (EXE-AUD-001→003).
- [ ] Custom fields support present for extensible entities (PLA-EXT-001).
- [ ] No cross-tenant foreign keys (PLA-TEN-003).
- [ ] State machines match spec definitions and emit correct domain events.
- [ ] Tests written and passing (Vitest/Playwright).
- [ ] No technology choices made without explicit authority citation.
- [ ] Commit message includes specific Requirement IDs being addressed.

## Constraints & Invariants
- Failure on any checklist item aborts the commit process until rectified.
- INV-001 (Strict Tenancy Isolation) and INV-002 (Read-Only Closed States) MUST be explicitly verified.

## Dependencies
- Relies on `forbidden-patterns-register.md`.

## Failure Modes
- If a checklist item fails, immediately switch to remediation mode before attempting commit again.

## Testing Requirements
- Run `vitest run` and `tsc --noEmit` as part of this checklist.

## Conformance Checks
- Must trace directly to GOV-TER-001→017 and PLA-TEN-001→006.

## Traceability
- All Spec Requirement IDs in the task.

## Open Decisions
- None.
