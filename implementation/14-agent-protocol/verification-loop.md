# Verification Loop

## Purpose
Details the build → test → conformance → commit cycle that must be executed continuously during implementation.

## Scope
In scope: Build verification, testing cycles, conformance auditing, architectural drift checks.
Out of scope: Initial context loading.

## Authority
- Authority: Bible V2, Platform Constitution
- Authority: EXISTING INFRASTRUCTURE

## Prerequisites
- Code has been written.
- Node.js/pnpm environment is configured.

## Specification Requirements
- WHAT MUST EXIST: Continuous verification processes to ensure no architectural drift occurs during implementation.

## Approved Architecture
- HOW IT SHOULD BE IMPLEMENTED: Use standard toolchains (tsc, ESLint, Vitest, Prisma) combined with static analysis and semantic review. (Authority: EXISTING INFRASTRUCTURE).

## Implementation Contract
HOW CLAUDE SHOULD EXECUTE the cycle:
1. **Build verification**: Run TypeScript compilation (`tsc --noEmit`), run `eslint .`, and `prisma generate`. Fix any issues immediately.
2. **Test verification**: Run `vitest run` for unit/integration tests. Run specific test commands if targeting UI/Playwright.
3. **Conformance verification**: Cross-reference against spec requirements. Run forbidden pattern scan (`forbidden-patterns-register.md`). Run invariant checks (tenancy, auditing).
4. **Architectural drift detection**: Check import boundaries. Ensure no undeclared direct dependency between capabilities exists. Validate dependency direction.
5. **Commit verification**: Ensure structured commit message with Requirement IDs. Check `self-review-checklist.md`.
6. **Continuous verification**: Re-verify build and tests after every non-trivial change, refactor, or dependency update.

## Constraints & Invariants
- Code that does not compile or pass tests MUST NOT be committed.
- No direct mutations to the DB bypassing the command layer.

## Dependencies
- TypeScript, Vitest, ESLint, Prisma.

## Failure Modes
- Build failure: Enter diagnostic mode, fix types/syntax.
- Test failure: Isolate, fix implementation or test.
- Drift detected: Refactor immediately to respect capability boundaries.

## Testing Requirements
- 100% pass rate required for `vitest run`.

## Conformance Checks
- Enforce Tenancy (PLA-TEN-001), Extensions (PLA-EXT-001).

## Traceability
- EXE-AUD-001→003

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Exact command aliases in `package.json` for running the full conformance suite in one command.
