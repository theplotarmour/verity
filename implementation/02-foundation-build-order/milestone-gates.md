# Milestone Gates

## Purpose
Defines the strict criteria (gates) that must be met before advancing from one implementation phase to the next.

## Scope
Covers all phase transitions from Phase 0 to Phase 7.

## Authority
- **Bible Guidelines**: Strict adherence to phased implementation.

## Prerequisites
- Implementation Roadmap.

## Specification Requirements
- Checklists mapping to spec sections for verification.

## Approved Architecture
- N/A

## Implementation Contract

### PHASE 0 → PHASE 1 GATE
- [ ] Prisma schema compiles and migrates.
- [ ] Tenant creation works.
- [ ] Auth integration works (sign up, sign in, session).
- [ ] Tenant isolation verified (cannot see other tenant's data).
- [ ] PLA-TEN-001→006 all implemented and tested.
- [ ] Base entity pattern established.

### PHASE 1 → PHASE 2 GATE
- [ ] Command pipeline works (MET-ACT-001→004).
- [ ] Event outbox works (MET-EVE-001→002).
- [ ] Audit trail works (EXE-AUD-001→003).
- [ ] Authorization engine works (Verb+Entity+Scope).
- [ ] Extension runtime works (PLA-EXT-001→004).
- [ ] First domain runtime test passes.

### PHASE 2 → PHASE 3 GATE
- [ ] Party CRUD with full state machine.
- [ ] User creation with 1:1 Party link (INV-003).
- [ ] Role and Permission assignment works.
- [ ] Organization hierarchy works.
- [ ] Location with geofence implemented.
- [ ] All core entities pass reusability test.
- [ ] Vertical slice complete end-to-end.

### PHASE 3 → PHASE 4 GATE
- [ ] Resource and Asset capabilities operational.
- [ ] Work Order complete state machine (GOV-TER-001).
- [ ] Operational core end-to-end tests passing.

### PHASE 4 → PHASE 5 GATE
- [ ] Supporting capabilities (Contract, Request) implemented.
- [ ] Request intake to Work Order conversion verified (GOV-TER-002).

### PHASE 5 → PHASE 6 GATE
- [ ] All business capability verticals complete.
- [ ] Domain APIs stable for shell integration.

### PHASE 6 → PHASE 7 GATE
- [ ] Shells functional.
- [ ] Offline/sync engine tested.
- [ ] External integrations tested.

## Constraints & Invariants
- A phase cannot be started until the previous phase's gate checklist is 100% complete.

## Dependencies
- Testing framework (Vitest, Playwright).

## Failure Modes
- Advancing without completing a gate will cause compounding architectural debt.

## Testing Requirements
- Automated test suites for each gate.

## Conformance Checks
- Run compliance scripts for each gate transition.

## Traceability
- Maps to all relevant spec requirement IDs per gate.

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Human review process specifics for gate approvals.
