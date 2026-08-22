# Conflict Resolution

## Purpose
Defines the policies and rules for resolving data conflicts during offline sync.

## Scope
- Conflict policy matrix
- Manual review queue

## Authority
- User directive: Conflict resolution matrix

## Prerequisites
- Offline Sync

## Specification Requirements
- N/A

## Approved Architecture
- **User-Defined Conflict Resolution Matrix** (Authority: User directive):
  | Mutation Type | Conflict Policy |
  |---|---|
  | Descriptive metadata | Last-Write-Wins (LWW) |
  | Operational state | Command validation (reject if stale) |
  | Financial state | Server-authoritative |
  | Append-only evidence | Append-only |
  | Attendance | Append-only / deduplicated |
  | Approval | Command validation |
  | Configuration | Versioned / explicit conflict |
  | Assignment | Command validation |
  | Audit | Append-only |
- **Conflict Detection**: Compare version tokens at command time.
- **Conflict Resolution**: Apply policy per mutation type.
- **Manual Review Queue**: For conflicts that cannot be auto-resolved (e.g. aborted state conflicts).
- **Reporting**: Log all conflicts for audit trail.

## Implementation Contract
1. Command handlers must evaluate the conflict matrix based on the fields being modified.
2. Create a `SyncConflict` model for items that enter the manual review queue.

## Constraints & Invariants
- Financial state is strictly server-authoritative.

## Dependencies
- Offline Sync
- Database Transactions

## Failure Modes
- Unhandled conflict type - Abort to manual review.

## Testing Requirements
- Test each row of the conflict matrix.

## Conformance Checks
- N/A

## Traceability
- N/A

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: UI structure for the manual review queue.
