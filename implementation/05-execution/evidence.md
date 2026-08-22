# Evidence (evidence.md)

## Purpose
This document outlines the immutable evidence primitive, ensuring proof of execution for Work Orders via photos, signatures, and geofencing.

## Scope
**In Scope:**
- Evidence entity and metadata
- Immutability guarantees
- Storage and upload prioritization
- GPS verification

**Out of Scope:**
- Real-time telemetry processing

## Authority
- **Bible V3 (Execution Engine):** Evidence is an immutable binary/payload linked to User ID, GPS, timestamp, Work Order ID.
- **Spec REQ-DATA-OFFLINE-003:** Mandatory Evidence Protection, Mobile priority.
- **EXISTING INFRASTRUCTURE:** S3/Supabase Storage.
- **User Matrix:** Append-only evidence conflict policy.

## Prerequisites
- Work Order and User/Party primitives exist.
- Supabase Storage buckets configured.

## Specification Requirements
- **WHAT MUST EXIST:** Mandatory Evidence Protection (REQ-DATA-OFFLINE-003).
- **WHAT MUST EXIST:** Evidence linked to User ID, GPS, Timestamp, and WorkOrder ID.
- **WHAT MUST EXIST:** Immutable records.

## Approved Architecture
- **Storage (Authority: EXISTING INFRASTRUCTURE):** Supabase Storage with tenant-scoped buckets.
- **Conflict Policy (Authority: User Matrix):** Append-only for evidence.
- **Data Model (Authority: Bible V1):** PostgreSQL for metadata.

## Implementation Contract
Claude Code shall implement the evidence system as follows:
1. Define a Prisma model `Evidence` storing metadata: `type` (PHOTO, VIDEO, SIGNATURE, GEOFENCE, MEASUREMENT), `url` (storage pointer), `userId`, `gpsCoordinates` (PostGIS point or lat/long floats), `timestamp`, and `workOrderId`.
2. Enforce DB-level Immutability: Do not generate an `update` function for the `Evidence` model in Prisma repositories. It must be append-only.
3. **GPS Verification Guard:** Upon `submit` of a Work Order, compare the `Evidence` GPS coordinates against the `WorkOrder` Location geofence. Flag or reject if out of bounds.
4. **Offline Support:** The mobile client (if applicable) queues evidence locally and syncs on reconnection, prioritizing evidence upload over general telemetry (REQ-DATA-OFFLINE-003).

## Constraints & Invariants
- Evidence records, once created, MUST NOT be modified or deleted under any circumstance (Append-only).
- Uploads must be placed in strictly tenant-isolated storage buckets.

## Dependencies
- **Depends on:** Work Order, Location, Party.
- **Depended on by:** Approvals, Audit.

## Failure Modes
- **Storage Upload Failure:** Handled by local queuing (REQ-DATA-OFFLINE-003) until success.

## Testing Requirements
- Unit test to ensure attempts to update an `Evidence` record throw an error.
- Integration test for GPS distance calculation against geofence.

## Conformance Checks
- Verify no HTTP `PUT` or `PATCH` endpoints exist for the Evidence resource.

## Traceability
- REQ-DATA-OFFLINE-003
- Bible V3

## Open Decisions
- **DEC-BIBLE-004**: Decoupling of Address and Location (reconciling whether address fields are unified under Location or separated as standalone Place profiles).
