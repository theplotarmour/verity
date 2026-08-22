# Idempotency

## Purpose
Ensures that commands and jobs can be retried safely without duplicate effects.

## Scope
- Command UUIDs
- Caching of results

## Authority
- Bible V3: Idempotent submission tokens, optimistic concurrency
- Bible V5: Offline sync
- DEC-006: Offline Command Reconciliation (PROPOSED status)

## Prerequisites
- Database (to store processed tokens)

## Specification Requirements
- Support offline command generation (REQ-DATA-OFFLINE-001)

## Approved Architecture
- **Command UUID Deduplication**: Server checks `commandId` before execution (Authority: Bible V3 + DEC-006).
- **Client Generation**: Client generates `OfflineCommand` with UUID `commandId` (Authority: Bible V5 + DEC-006 PROPOSED).
- **Replay Safety**: Replaying a command sequence produces identical results.
- **Idempotency Key Storage**: Keys are stored and expire after a set time.

## Implementation Contract
1. Maintain an `ProcessedCommand` table/store keyed by `commandId`.
2. Before processing a command, attempt to insert the `commandId`. If it exists, return the cached successful response or indicate it was already processed.
3. Wrap mutations in transactions to ensure atomicity with the idempotency record.

## Constraints & Invariants
- INV-001: Strict Tenancy Isolation. Idempotency records are tenant-scoped.

## Dependencies
- Database Transactions

## Failure Modes
- Race condition on submission - Handled by DB unique constraint on `commandId`.

## Testing Requirements
- Test concurrent submission of the same commandId.

## Conformance Checks
- N/A

## Traceability
- REQ-DATA-OFFLINE-001

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Idempotency key expiry duration.
