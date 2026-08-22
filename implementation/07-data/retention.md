# Retention

## Purpose
Defines the lifecycle, archival, and deletion policies for data.

## Scope
- Audit retention
- Telemetry limits
- Soft vs Hard delete

## Authority
- Spec EXE-AUD-001: Operational audit
- Spec EXE-AUD-002: Security audit
- Spec REQ-DATA-OFFLINE-001→003: Offline limits & evidence

## Prerequisites
- Schema Construction

## Specification Requirements
- Storage exhaustion protocols (REQ-DATA-OFFLINE-002).

## Approved Architecture
- **Operational Audit**: Infinite retention (EXE-AUD-001).
- **Security Audit**: Infinite retention (EXE-AUD-002).
- **Telemetry Limits**: Local storage limits for GPS/location data (REQ-DATA-OFFLINE-001).
- **Storage Exhaustion**: Compress older telemetry, warn worker, preserve evidence (REQ-DATA-OFFLINE-002).
- **Evidence**: Never deleted (REQ-DATA-OFFLINE-003).

## Implementation Contract
1. Implement client-side quota management for offline telemetry.
2. Implement server-side retention policies (cron jobs) for non-audit ephemeral data if needed.

## Constraints & Invariants
- Evidence is immutable and immortal.

## Dependencies
- Offline Sync

## Failure Modes
- Disk full - Client compresses telemetry, stops logging non-critical paths.

## Testing Requirements
- Test telemetry compression on client.

## Conformance Checks
- EXE-AUD-001, EXE-AUD-002.

## Traceability
- EXE-AUD-001, EXE-AUD-002, REQ-DATA-OFFLINE-001, REQ-DATA-OFFLINE-002, REQ-DATA-OFFLINE-003

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Soft delete vs hard delete strategy for general entities.
