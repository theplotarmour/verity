# Capability Promotion

## Purpose
This document defines the lifecycle maturity levels of a capability, from initial draft to General Availability (GA).

## Scope
**In Scope:** Maturity levels, promotion gates, regression criteria.
**Out of Scope:** Feature flagging tools.

## Authority
- Bible Synthesis, ADOPTED/ADAPTED

## Prerequisites
- Capability Registration established.

## Specification Requirements
- Capabilities must be gated based on their maturity to prevent unstable features from breaking core workflows.

## Approved Architecture
- Gradual promotion through specific checklists.

## Implementation Contract

### MATURITY LEVELS:
- **Draft:** Entity models and commands defined, basic tests exist.
- **Alpha:** Complete CRUD operations, state machine implemented, events published, basic UI available.
- **Beta:** Full test suite implemented, offline support included, conformance passing.
- **GA (General Availability):** Production-ready, performance baseline established, all 31 points of the Implementation Contract met, and the 8-point Reusability Test passed.

### Lifecycle Management
- **Promotion gates:** A capability can only move to the next level when all criteria for that level are verified.
- **Regression:** A capability can be demoted if it fails to maintain its baseline (e.g., performance drops, tests fail).
- **Industry Pack eligibility:** Only GA capabilities can be included in specific industry packs or external deployments.

## Constraints & Invariants
- Beta and Alpha capabilities must not block GA capabilities.

## Dependencies
- Capability Implementation Contract.

## Failure Modes
- Promoting too early introduces instability.
- Regressions in GA capabilities erode trust.

## Testing Requirements
- Automated checks verifying test coverage and performance baselines before promotion.

## Conformance Checks
- Architectural review board or automated PR checks.

## Traceability
- Bible Synthesis

## Open Decisions
- NONE.
