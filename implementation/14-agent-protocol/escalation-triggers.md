# Escalation Triggers

## Purpose
Defines specific situations requiring human input, how to format the escalation, and how to continue working while waiting for resolution.

## Scope
In scope: Escalation levels, templates, and async continuation protocols.
Out of scope: Autonomous error correction.

## Authority
- Authority: Bible V2, Platform Constitution

## Prerequisites
- A condition from `stop-conditions.md` has been met.

## Specification Requirements
- WHAT MUST EXIST: A mechanism for the autonomous agent to yield control and query the human orchestrator without deadlocking the entire project.

## Approved Architecture
- HOW IT SHOULD BE IMPLEMENTED: Severity-mapped triggers (P0-P3) logged to the Implementation Journal and presented to the human orchestrator.

## Implementation Contract
HOW CLAUDE SHOULD EXECUTE:

**Triggers & Severity Levels:**
- **P0 (Critical Halt)**: Constitutional Invariant violation risk. Cross-tenant leak risk.
  - *Example*: Spec requests a shared lookup table that merges tenant data without isolation rules.
- **P1 (Blocker)**: Spec gap, circular dependency, missing technology authority.
  - *Example*: Spec requires a job queue, but Inngest is marked as "IMPLEMENTATION DECISION REQUIRED".
- **P2 (Ambiguity)**: Unclear terminology, multiple valid paths.
  - *Example*: A new entity seems like a "Work Order" but is called a "Job" in one isolated spec paragraph. (Prohibited synonym detected).
- **P3 (Suggestion)**: Optimization or minor improvement.

**Escalation Template:**
When escalating, write to the Implementation Journal and alert the user:
```markdown
### ESCALATION: [Severity] - [Short Title]
**Context**: [What you were trying to do, with Requirement IDs]
**Trigger**: [Why you stopped - cite specific stop-condition]
**Impact**: [What is blocked]
**Proposed Solution / Options**: [If applicable, 1-2 authorized options]
**Status**: WAITING_FOR_HUMAN
```

**Continuation Protocol:**
- Record the escalation in the Implementation Journal.
- Pivot to a completely independent, non-blocked capability or component (e.g., if domain logic is blocked, work on isolated UI components or unrelated foundation tasks).
- Do NOT guess the answer to the escalation.

## Constraints & Invariants
- P0 escalations halt all related system work.
- Never use a prohibited synonym (e.g., job_card, client_obj) to bypass an escalation.

## Dependencies
- Interacts closely with `stop-conditions.md` and the Implementation Journal.

## Failure Modes
- If all work is blocked by a P0/P1, Claude must yield the session entirely to the user.

## Testing Requirements
- Verify escalations are properly written to the journal before yielding.

## Conformance Checks
- N/A

## Traceability
- PRN-001 (Least Surprise)

## Open Decisions
- None.
