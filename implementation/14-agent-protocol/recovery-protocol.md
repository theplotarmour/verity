# Recovery Protocol

## Purpose
Defines the steps Claude must take when a build phase fails, tests fail, or non-conformant output is produced, ensuring deterministic recovery to a clean state.

## Scope
In scope: Compilation failures, test failures, conformance failures, drift, dependency cycles, and rollback procedures.
Out of scope: Hardware or OS level failures.

## Authority
- Authority: Bible V2, Platform Constitution

## Prerequisites
- A working Git repository.
- Verification Loop tools are installed.

## Specification Requirements
- WHAT MUST EXIST: Automated protocols to self-heal or safely abort without leaving the repository in a broken state.

## Approved Architecture
- HOW IT SHOULD BE IMPLEMENTED: Standardized diagnostic trees and explicit rollback commands.

## Implementation Contract
HOW CLAUDE SHOULD EXECUTE:

**COMPILATION FAILURE:**
1. Run `tsc --noEmit` to get precise errors.
2. Identify if the failure is typing mismatch, missing import, or syntax error.
3. Fix locally. Re-verify.

**TEST FAILURE:**
1. Isolate the failing test using `vitest run <file>`.
2. Determine if the test is flawed (spec bug/misinterpretation) or the implementation is flawed.
3. Fix and re-verify.

**CONFORMANCE FAILURE:**
1. Identify the violated requirement (e.g., missing tenant isolation).
2. Trace to the root cause (e.g., forgot `.where({ tenantId })`).
3. Remediate and run full `self-review-checklist.md`.

**FORBIDDEN PATTERN DETECTED:**
1. Execute string replace or AST refactor to remove the forbidden legacy pattern (`forbidden-patterns-register.md`).
2. Implement the correct, canonical alternative.
3. Re-verify.

**ARCHITECTURAL DRIFT (Boundary Violation):**
1. Identify the boundary violation (e.g., capability A directly imports internal module of capability B).
2. Refactor to use the declared contract, platform service, or domain event instead.
3. Update import boundary rules.

**DEPENDENCY CYCLE:**
1. Identify the cycle (e.g., A -> B -> A).
2. Determine correct dependency direction from spec / `architecture-dependency-graph.md`.
3. Extract shared logic or invert dependencies (e.g., using events) to resolve.

**SPEC GAP DISCOVERED:**
1. STOP immediately.
2. Follow `escalation-triggers.md`.
3. Document gap, stash changes, continue on independent work.

**ROLLBACK PROTOCOL:**
- If state becomes hopelessly tangled or an invariant cannot be satisfied cleanly:
  1. Use `git reset --hard` to revert to the last known good commit.
  2. Use `git clean -fd` to remove untracked garbage files.
  3. Log the rollback in the Implementation Journal.

**REBUILD PROTOCOL:**
- If the Prisma schema or DB state is corrupted:
  1. `prisma generate`
  2. `prisma db push --force-reset` (or local equivalent)
  3. Re-seed test data.

## Constraints & Invariants
- Never push or commit broken state.

## Dependencies
- Relies on Git for state management.

## Failure Modes
- If Git itself is corrupted, STOP and escalate to user.

## Testing Requirements
- Recovery logic is tested by deliberately running broken code through Claude in dry-runs (out of scope for active dev).

## Conformance Checks
- N/A

## Traceability
- PRN-001: Least Surprise.

## Open Decisions
- None.
