# Capability Implementation Contract

## Purpose
This document defines the strict criteria and lifecycle for implementing a capability within the Verity platform. It ensures consistency, reusability, and correctness across all domain models.

## Scope
**In Scope:** Definition of Done for a capability, the reusability test, and the exact checklist Claude Code must follow.
**Out of Scope:** Specific domain models (covered in domain-specific capability documents).

## Authority
- Bible V1 (System of Record)
- Bible V5 (Platform Architecture)
- Spec MET-ACT-001→004, MET-EVE-001→002, EXE-AUD-001→003, PLA-EXT-001→004, PLA-TEN-001→006

## Prerequisites
- Tenancy foundation implemented
- Extension mechanisms (CustomFields) defined
- Platform observability initialized

## Specification Requirements
- A capability must implement the complete 31-point checklist to be considered functional.
- A capability must pass the 8-point reusability test to be considered complete.

## Approved Architecture
- Capability isolation via domain events and well-defined contracts.
- Avoidance of direct tight coupling beyond core dependencies.

## Implementation Contract

### THE 31-POINT CAPABILITY CHECKLIST:
1. Entity models defined (tenant_id, timestamps, version, customFields)
2. State machine defined (states, transitions, guards, side effects)
3. Commands implemented (MET-ACT-001→004 pipeline)
4. Queries implemented (tenant-filtered, PLA-TEN-002)
5. Events defined (MET-EVE-001→002, outbox)
6. Audit trail (EXE-AUD-001→003)
7. Permissions defined (Verb+Entity+Scope)
8. Authorization enforced at command level
9. UI permission gating
10. Custom fields support (PLA-EXT-001→003)
11. Lifecycle hooks (PLA-EXT-004)
12. API endpoints
13. Offline support (where applicable)
14. Conflict resolution policies
15. Unit tests
16. Integration tests
17. Authorization tests
18. Tenancy isolation tests
19. State machine transition tests
20. Spec conformance verified
21. Forbidden pattern check
22. Naming conventions (GOV-TER glossary)
23. No undeclared cross-capability dependencies
24. Documentation
25. Traceability matrix
26. Error handling (typed errors, proper HTTP codes)
27. Validation messages (user-friendly)
28. Event naming follows convention
29. Schema migration included
30. Seed data for testing
31. Performance baseline established

### THE 8-POINT REUSABILITY TEST:
1. Can this capability be enabled independently?
2. Can it be configured without modifying core?
3. Can it be reused by another client?
4. Can it be packaged?
5. Can it be versioned?
6. Can it be upgraded?
7. Can it be extended?
8. Can it be tested outside the originating client?

**A capability is DONE only when BOTH pass.**

## Constraints & Invariants
- INV-001: Strict Tenancy Isolation must be observed in all entities.
- INV-002: Read-Only Closed States must be enforced by state machines.
- No undeclared cross-capability dependencies.

## Dependencies
- Core platform capabilities.

## Failure Modes
- Skipping points on the checklist leads to fragmented implementations.
- Failing the reusability test indicates tight coupling to specific industry requirements.

## Testing Requirements
- Capability must pass all testing requirements outlined in testing-requirements.md.

## Conformance Checks
- Review pull requests against the 31-point checklist.
- Verify separation of concerns via static analysis.

## Traceability
- MET-ACT-001→004
- MET-EVE-001→002
- EXE-AUD-001→003
- PLA-EXT-001→004
- PLA-TEN-001→006

## Open Decisions
- NONE.
