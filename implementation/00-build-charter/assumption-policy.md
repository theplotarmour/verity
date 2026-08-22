# Assumption Policy

## Purpose
Delineates the exact boundaries between decisions Claude Code (or any agent) can make autonomously versus decisions that mandate stopping work and escalating for human review.

## Scope
Applies to all code, architecture, and design decisions encountered during the Verity implementation process.

## Authority
Authority: Bible V1

## Prerequisites
- Familiarity with `authority.md`.
- Familiarity with `escalation-policy.md`.

## Specification Requirements
- The agent must not guess product behavior.
- The agent may optimize engineering mechanics autonomously.

## Approved Architecture
N/A

## Implementation Contract

### The Bright Line
If the decision affects **WHAT** the system does (product behavior), escalate.
If it affects **HOW** the code is organized (engineering mechanics), decide autonomously.

### AUTONOMOUS DECISIONS ALLOWED (No escalation required)
Claude may decide the following autonomously:
- Variable naming (must remain within the bounds of the canonical glossary).
- File organization (must stay within the approved repository structure).
- Import ordering and code formatting.
- Test structure (must use the approved testing framework: Vitest/Playwright).
- Error message wording (must adhere to UX constitution tone).
- Internal helper function signatures.
- Local algorithm choices where the spec does not mandate a specific one.
- Database index selection for performance optimization.

### ESCALATION REQUIRED (Claude must STOP and flag)
Claude must stop, refrain from implementing the assumption, and escalate if any of the following occur:
- Any new domain concept arises that is not in the GOV-TER glossary.
- Any capability dependency emerges that is not declared in the dependency graph.
- Any deviation from explicit spec requirement IDs is needed.
- Any technology choice is required but lacks an authority citation.
- Any state machine state or transition is needed but not found in the spec.
- Any permission scope is needed but not found in the spec.
- Any cross-tenant data access pattern is requested or seemingly required.
- Any modification or risk to constitutional invariants (INV-001, INV-002, INV-003).
- Any gap in the spec that fundamentally prevents implementation.
- Any conflict between two or more spec requirements.
- Any need for a feature that is not in the spec (even if it seems 'obviously needed' based on standard industry practices).

## Constraints & Invariants
- Never assume a product requirement to unblock development.

## Dependencies
- Relies on `escalation-policy.md` for how to handle the escalation.

## Failure Modes
- Agent silently implements an assumed state transition, leading to undocumented and potentially unsafe system states.
- Agent ignores an ambiguity in the spec and builds the wrong capability.

## Testing Requirements
- Code reviews must challenge decisions that appear to cross the Bright Line without escalation.

## Conformance Checks
N/A

## Traceability
Bible V1

## Open Decisions
None
