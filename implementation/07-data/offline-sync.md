# Offline Sync

## Purpose
Defines the mechanics for syncing offline commands and telemetry from clients.

## Scope
- Offline commands
- Telemetry compression
- Evidence priority

## Authority
- Bible V5 + DEC-006 PROPOSED
- Spec REQ-DATA-OFFLINE-001→003, REQ-DATA-SYNC-001→002
- EXISTING INFRASTRUCTURE: idb, Serwist

## Prerequisites
- Idempotency

## Specification Requirements
- Support offline command generation and sync (REQ-DATA-SYNC-001, 002).

## Approved Architecture
- **Offline Command**: Client generates `OfflineCommand` with UUID `commandId` and `deviceTimestamp`.
- **Server Guarantees**: Idempotency and chronological replay.
- **Sync Logic**: Field-level LWW for descriptive metadata, state conflicts abort to manual review, delete-wins default. High-frequency pulse logs merge identical consecutive data.
- **Telemetry Compression**: Before sync (REQ-DATA-SYNC-001).
- **Context Verification**: On every upload (REQ-DATA-SYNC-002) - validate session, tenancy boundary.
- **Evidence Priority**: Photos/signatures uploaded before telemetry.
- **Storage & Background**: IndexedDB for local storage (`idb` package), Service worker for background sync (Serwist).

## Implementation Contract
1. Client stores actions in IndexedDB.
2. Background sync queue prioritizes Evidence -> Commands -> Telemetry.
3. Server endpoint accepts batch sync payloads.

## Constraints & Invariants
- INV-001: Context verification must strictly enforce tenancy.

## Dependencies
- Conflict Resolution

## Failure Modes
- Sync payload too large - Chunking required.
- Invalid context - Reject payload.

## Testing Requirements
- Test background sync prioritization.
- Test chronological replay.

## Conformance Checks
- REQ-DATA-SYNC-001, 002.

## Traceability
- REQ-DATA-SYNC-001, REQ-DATA-SYNC-002

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Specific pulse log merging algorithm.
