# Authority Hierarchy

## Purpose
Defines the complete authority hierarchy governing all implementation decisions for the Verity platform rebuild. It establishes how to determine which source of truth governs a specific decision, how to handle conflicts, and how to properly document the provenance of technical choices.

## Scope
This document covers all technology, architecture, product, and implementation decisions made during the Verity implementation process by any agent or human contributor.

## Authority
Authority: Bible V1

## Prerequisites
None

## Specification Requirements
- All implementation decisions must follow a formalized authority hierarchy.
- A strict separation of concerns must be maintained across documentation and implementation:
  - WHAT MUST EXIST (spec)
  - HOW IT SHOULD BE IMPLEMENTED (architecture decisions)
  - HOW CLAUDE SHOULD EXECUTE (handoff)
- Every concrete technology choice must cite its authority.

## Approved Architecture
The system relies on an 8-level authority hierarchy to resolve any ambiguities or conflicts:
1. Constitutional Decisions (Highest priority)
2. Bible Volumes
3. Approved Architecture Decisions
4. Transformed PRD
5. External Research
6. Odoo Reference PRD
7. Legacy Codebase
8. Assumptions (Lowest priority)

### Conflict Resolution
When authorities conflict, the following resolution priority must be applied:
Safety > Truth > Coherence > Usefulness > Simplicity > Flexibility > Polish

### Three-Layer Separation
1. **WHAT MUST EXIST**: This refers to the product or platform requirement derived directly from the Master Platform Specification.
2. **HOW IT SHOULD BE IMPLEMENTED**: This refers to the approved architecture decision detailing the technical approach, accompanied by a precise authority citation.
3. **HOW CLAUDE SHOULD EXECUTE**: This refers to the implementation handoff guidance, providing step-by-step instructions or contracts for the implementing agent.

### Technology Authority Labeling System
Any concrete technology choice MUST use one of the following exact citation formats:
- `Authority: Bible V[N], [section]` - For constitutional requirements.
- `Authority: Bible Synthesis, ADOPTED/ADAPTED` - For reference architecture decisions.
- `Authority: Spec [REQ-ID]` - For specification requirements.
- `Authority: DEC-[N]` - For product decisions.
- `Authority: EXISTING INFRASTRUCTURE` - For retained infrastructure choices (e.g., Next.js 16).
- `Authority: IMPLEMENTATION DECISION REQUIRED` - When no valid authority exists and an escalation is required.

## Implementation Contract
- Always reference the highest applicable authority level for any technical decision.
- Do not invent new technologies or patterns outside of the approved stack without explicit authorization.
- Use the Technology Authority Labeling System in all commit messages, PR descriptions, and inline documentation for major architectural choices.

### Autonomous vs Escalated Decisions
- **Autonomous Decisions**: Claude may make implementation decisions autonomously if they strictly concern engineering mechanics (e.g., file organization within an approved structure, internal helper functions).
- **Escalation Required**: Claude must stop and escalate if the decision affects product behavior, violates constraints, or requires introducing a new technology without an existing authority citation. (Refer to `assumption-policy.md` and `escalation-policy.md`).

### Examples of Correct Authority Citation
- "PostgreSQL will be used for the System of Record. (Authority: Bible V1)"
- "Tenancy isolation must be enforced via RLS. (Authority: Spec PLA-TEN-001)"
- "Tailwind CSS v4 will be used for styling. (Authority: EXISTING INFRASTRUCTURE + Bible V4)"
- "Inngest usage for background jobs is undecided. (Authority: IMPLEMENTATION DECISION REQUIRED)"

## Constraints & Invariants
- INV-001: Strict Tenancy Isolation
- INV-002: Read-Only Closed States
- INV-003: Unified Party Identity
- PRN-001: Least Surprise / Explainable Automation
- PRN-002: Progressive Disclosure of Complexity

## Dependencies
None

## Failure Modes
- Implementing a feature based on an Assumption when a Bible Volume contradicts it.
- Failing to resolve conflicts according to the designated priority (e.g., prioritizing Polish over Safety).

## Testing Requirements
Code and design reviews must verify that all non-trivial decisions include a valid authority citation.

## Conformance Checks
Documentation linting to ensure authority labels are present in implementation handoff documents.

## Traceability
Governs all spec requirements globally.

## Open Decisions
None
