# Vertical Slice Strategy

## Purpose
Defines the strategy for implementing one complete capability (Party) end-to-end before broadening to other capabilities.

## Scope
Covers Phase 2 execution, focusing on the Party capability vertical slice.

## Authority
- **INV-003**: Unified Party Identity
- **GOV-TER-006**: User 1:1 with Party

## Prerequisites
- Phase 0 and Phase 1 complete.

## Specification Requirements
- Unified Party identity system.
- Full capability stack: Schema, State Machine, Commands, Queries, Events, Audit, Permissions, API, UI, Tests.

## Approved Architecture
- Vertical slice through all architectural layers to prove the platform foundation.

## Implementation Contract

### The Vertical Slice Principle
Implement `Party` as the first complete capability. It touches every layer of the architecture and serves as the template for all subsequent capabilities.

### Layers to Implement

1. **Schema**: Prisma model for `Party` with `tenant_id`, timestamps, version, `customFields`.
2. **State Machine**: `PartyState` (Invited → Active → Suspended → Archived).
3. **Commands**: `createParty`, `updateParty`, `transitionParty` (MET-ACT-001→004).
4. **Queries**: `getParty`, `findParties`, `listParties` (with tenant filter).
5. **Events**: `party.created`, `party.updated`, `party.transitioned` (MET-EVE-001→002).
6. **Audit**: Party change log (EXE-AUD-001).
7. **Permissions**: `party.create`, `party.read`, `party.update` (Verb + Entity + Scope).
8. **Custom Fields**: Metadata integration (PLA-EXT-001).
9. **API**: Server actions or REST endpoints.
10. **UI**: Basic CRUD interface in one shell.
11. **Tests**: Unit, integration, authorization, tenancy.

### Why Party First
`Party` is required by `User` (GOV-TER-006), and `User` is required by virtually every other capability in the system.

### Breadth After Slice
Once the `Party` slice is complete and passes all tests, proceed to implement `User`, `Role`, `Permission`, `Organization`, and `Location` using the established patterns.

## Constraints & Invariants
- Do not skip layers in the vertical slice.

## Dependencies
- Phase 1 Domain Runtime.

## Failure Modes
- Leaky abstractions discovered during the slice implementation requiring Phase 1 refactoring.

## Testing Requirements
- End-to-end testing of the complete Party slice.

## Conformance Checks
- Verify compliance with INV-003.

## Traceability
- INV-003, GOV-TER-006.

## Open Decisions
- **DEC-BIBLE-001**: Party Lifecycle Initial State (reconciling Prospect vs Invited as the starting lifecycle state).
