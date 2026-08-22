# Stop Conditions

## Purpose
Defines the explicit conditions under which Claude must stop writing code and flag for human review, preventing hallucinated architecture, invariant violations, or misaligned implementations.

## Scope
In scope: Stop criteria for immediate halts, escalations, and documentation pauses.
Out of scope: Standard error resolution (e.g., syntax errors) which Claude can fix autonomously.

## Authority
- Authority: Bible V2, Platform Constitution
- Authority: Bible Synthesis, ADOPTED

## Prerequisites
- Claude is currently executing a task or loading context.

## Specification Requirements
- WHAT MUST EXIST: Clear, unambiguous circuit breakers that halt autonomous execution to prevent damage or drift.

## Approved Architecture
- HOW IT SHOULD BE IMPLEMENTED: A three-tier classification of stop conditions: Immediate Stop, Stop and Escalate, Stop and Document.

## Implementation Contract
HOW CLAUDE SHOULD EXECUTE: Monitor for these triggers constantly.

**STOP IMMEDIATELY (Do not proceed, do not commit):**
- A Constitutional Invariant would be violated (e.g., Tenancy Isolation, Read-Only Closed States).
- A Spec requirement is mathematically or logically contradictory/impossible.
- A severe security vulnerability is discovered.
- Cross-tenant data exposure is possible.
- Audit immutability would be compromised.

**STOP AND ESCALATE (Pause current track, request human input, pivot to unrelated work):**
- A new domain concept is needed that is NOT in the canonical GOV-TER glossary.
- A concrete technology choice is required but NO authority citation exists.
- A spec gap completely prevents implementation.
- Capability dependency conflict (e.g., circular dependencies).
- Architecture decision required for a novel problem.
- Performance concern with no clear, authorized resolution.

**STOP AND DOCUMENT (Pause to write down findings, then proceed if safe or ask for input):**
- Multiple equally valid implementation approaches exist for a non-trivial feature.
- Spec ambiguity exists that doesn't block implementation, but could lead to divergent outcomes.
- Optimization opportunity identified.
- Spec improvement suggestion.

## Constraints & Invariants
- Never invent a domain concept. If you need one, STOP AND ESCALATE.
- Never guess a technology. If not in EXISTING INFRASTRUCTURE or the Bible, STOP AND ESCALATE.

## Dependencies
- Relies on `escalation-triggers.md` for the mechanics of escalating.

## Failure Modes
- If Claude fails to stop, the `verification-loop` conformance checks and invariant tests must catch the error.

## Testing Requirements
- Simulation of contradictory specs should trigger these stops in tests.

## Conformance Checks
- Glossary enforcement (GOV-TER) and Tenancy (PLA-TEN).

## Traceability
- PRN-001: Least Surprise / Explainable Automation.

## Open Decisions
- None.
