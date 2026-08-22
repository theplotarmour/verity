# Definition of Done

## Purpose
Defines the strict completion criteria that must be met before a capability implementation can be considered finished.

## Scope
Applies to every individual capability, feature, or domain module built within the Verity platform.

## Authority
Authority: Spec capability construction guide (verity-spec/14_client_system_construction/)

## Prerequisites
- Capability specification must be finalized.
- Target domain models must be approved.

## Specification Requirements
- A capability is not "done" until it passes BOTH the 31-point capability implementation checklist AND the 8-point Reusability Test.

## Approved Architecture
N/A - This governs process, not technical architecture.

## Implementation Contract

### The 31-Point Capability Implementation Checklist
1. Entity models defined with tenant_id, timestamps, version, customFields
2. State machine defined with all transitions, guards, and side effects
3. Commands implemented with MET-ACT-001→004 (validation→auth→precondition→mutation→event)
4. Queries implemented with tenant filtering (PLA-TEN-002)
5. Events defined and emitted via outbox pattern (MET-EVE-001→002)
6. Audit trail implemented (EXE-AUD-001→003)
7. Permissions defined (Verb+Entity+Scope)
8. Authorization enforced at command level
9. UI permissions gating implemented
10. Custom fields support (PLA-EXT-001→003)
11. Lifecycle hooks registered (PLA-EXT-004)
12. API endpoints defined
13. Offline support (where applicable) (REQ-DATA-OFFLINE-001→003)
14. Conflict resolution policies assigned
15. Unit tests implemented
16. Integration tests implemented
17. Authorization tests implemented
18. Tenancy isolation tests implemented
19. State machine transition tests implemented
20. Spec conformance verified
21. Forbidden pattern check passed (refer to `no-legacy-policy.md`)
22. Naming conventions verified against GOV-TER glossary
23. No undeclared cross-capability dependencies
24. Documentation updated
25. Traceability matrix updated
26. Capability-specific spec checks verified (Part 1)
27. Capability-specific spec checks verified (Part 2)
28. Capability-specific spec checks verified (Part 3)
29. Capability-specific spec checks verified (Part 4)
30. Capability-specific spec checks verified (Part 5)
31. Capability-specific spec checks verified (Part 6)

### The 8-Point Reusability Test
1. Can this capability be enabled independently?
2. Can it be configured without modifying core?
3. Can it be reused by another client?
4. Can it be packaged?
5. Can it be versioned?
6. Can it be upgraded?
7. Can it be extended?
8. Can it be tested outside the originating client?

## Constraints & Invariants
- A capability failing any single point in either checklist cannot be merged into the main implementation branch.

## Dependencies
- Relies on testing frameworks (Vitest, Playwright).
- Relies on Audit and Tenancy specifications.

## Failure Modes
- Releasing a capability that cannot be versioned or extended independently.
- Missing tenant isolation on queries, violating INV-001.

## Testing Requirements
Checklist items 15-19 mandate comprehensive testing at unit, integration, and security levels.

## Conformance Checks
A CI/CD pipeline step must attest that the DOD has been met for the modified capabilities.

## Traceability
MET-ACT-001→004, MET-EVE-001→002, EXE-AUD-001→003, PLA-TEN-001→002, PLA-EXT-001→004, REQ-DATA-OFFLINE-001→003

## Open Decisions
None
