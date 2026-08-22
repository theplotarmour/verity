# Escalation Policy

## Purpose
Defines the protocol for handling situations that require human review, specifically when an agent encounters boundaries defined in the `assumption-policy.md`.

## Scope
Applies to all implementation blockers, ambiguities, missing specifications, and architectural conflicts encountered by AI agents or developers.

## Authority
Authority: Bible V1

## Prerequisites
- Familiarity with `assumption-policy.md`.
- Understanding of the authority hierarchy (`authority.md`).

## Specification Requirements
- Standardized severity levels for escalations.
- Strict formatting for reporting escalations to humans.

## Approved Architecture
N/A

## Implementation Contract

### Escalation Severity Levels
- **P0-BLOCKER**: Constitutional invariant violation discovered, specification contradiction found, or severe security vulnerability.
- **P1-CRITICAL**: Missing specification requirement needed for implementation, core architecture decision required, or capability dependency conflict.
- **P2-IMPORTANT**: Ambiguous specification language, multiple valid implementation approaches with distinct product tradeoffs, or major performance concern.
- **P3-INFORMATIONAL**: Specification improvement suggestion, minor naming preference, or documentation gap.

### Escalation Format
When escalating, Claude MUST provide a structured report containing:
1. **Related Spec IDs**: The specific spec requirement ID(s) involved.
2. **Exact Text**: The exact text of the requirement or a description of the gap.
3. **Attempted Actions**: What Claude attempted, analyzed, or considered.
4. **Reason for Escalation**: Why autonomous resolution is not appropriate (citing `assumption-policy.md`).
5. **Proposed Options**: Proposed options (if any) with their respective tradeoffs.
6. **Impact**: Impact of delaying the decision (e.g., what components are blocked).

### What Happens During Escalation
- Implementation of the affected component **STOPS** immediately.
- Work may continue on entirely independent components if safely isolated.
- The escalation is logged explicitly in the implementation journal or passed to the user via messaging.
- Resolution of the escalation must be recorded as a concrete decision accompanied by a proper authority citation (e.g., `Authority: DEC-042`).

## Constraints & Invariants
- An agent must never proceed with implementing a P0 or P1 escalation component until explicit human resolution is provided.

## Dependencies
- Interacts with `assumption-policy.md`.

## Failure Modes
- Failing to include proposed tradeoffs, forcing the human to do the research the agent could have done.
- Escalating trivial formatting issues (which violates `assumption-policy.md`).

## Testing Requirements
N/A

## Conformance Checks
N/A

## Traceability
Bible V1

## Open Decisions
None
