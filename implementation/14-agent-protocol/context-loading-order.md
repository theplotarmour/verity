# Context Loading Order

## Purpose
Specifies the exact sequence of documents Claude must read before writing any code to ensure foundational invariants and architectures are loaded first.

## Scope
In scope: Which documents to read at what phases of execution.
Out of scope: Detailed content of the documents themselves.

## Authority
- Authority: Bible V2, Platform Constitution

## Prerequisites
- implementation/ folder must exist and contain the required handoff documents.

## Specification Requirements
- WHAT MUST EXIST: A deterministic sequence of context bootstrapping to prevent Claude from hallucinating architectures or injecting legacy assumptions.

## Approved Architecture
- HOW IT SHOULD BE IMPLEMENTED: 5-level reading protocol prioritizing constitutional invariants above specific capability specs.

## Implementation Contract
Claude MUST read files in this exact order depending on the current operational phase:

**LEVEL 0 (ALWAYS READ FIRST — Constitutional):**
1. `implementation/README.md`
2. `implementation/00-build-charter/authority.md`
3. `implementation/00-build-charter/agent-rules.md`
4. `implementation/00-build-charter/no-legacy-policy.md`

**LEVEL 1 (READ BEFORE ANY NEW PHASE):**
5. `implementation/02-foundation-build-order/architecture-dependency-graph.md`
6. `implementation/02-foundation-build-order/bootstrap-sequence.md`
7. `implementation/02-foundation-build-order/milestone-gates.md`

**LEVEL 2 (READ BEFORE IMPLEMENTING A SPECIFIC AREA):**
8. The relevant platform foundation guide (`03-platform-foundation/*.md`)
9. The relevant domain runtime guide (`04-domain-runtime/*.md`)
10. The relevant spec section (`verity-spec/[section]/*.md`)

**LEVEL 3 (READ BEFORE IMPLEMENTING A CAPABILITY):**
11. `implementation/09-capabilities/implementation-contract.md`
12. `implementation/09-capabilities/dependency-order.md`
13. The specific capability spec (`verity-spec/04_core_capabilities/[cap]/` or `05_business_capabilities/[cap]/`)

**LEVEL 4 (READ BEFORE COMMITTING):**
14. `implementation/14-agent-protocol/self-review-checklist.md`
15. `implementation/13-conformance/forbidden-patterns.md`
16. `implementation/13-conformance/implementation-invariant-checks.md`

**LEVEL 5 (READ ON SESSION START/END):**
17. `implementation/14-agent-protocol/session-continuity.md`
18. Implementation journal (if exists)

## Constraints & Invariants
- Level 0 must be read before ANY code generation is attempted.
- Do not bypass levels. Capability implementation (Level 3) requires Level 2 foundation knowledge.

## Dependencies
- Depends on the existence of the documents listed in the order.

## Failure Modes
- If a document is missing, DO NOT assume its contents. Label as an open gap and escalate.

## Testing Requirements
- Claude must output a brief acknowledgment of loaded context before proceeding.

## Conformance Checks
- Ensure no code is written that contradicts Level 0 invariants (e.g., Tenancy, Naming).

## Traceability
- EXE-AUD-002, GOV-TER-001

## Open Decisions
- None.
