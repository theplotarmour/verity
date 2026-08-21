---
doc_id: TEST-UPLOAD_EVIDENCE
title: Test catalogue — Upload captured evidence
generated: true
source_model: _model/capabilities/evidence_capture.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Upload captured evidence

*This document is generated. Edit `_model/capabilities/evidence_capture.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `upload_evidence` is invoked by an authorised actor, then the declared records are created/updated and events ['evidence.uploaded'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `upload_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `upload_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `upload_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `upload_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `upload_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `upload_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `upload_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `upload_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `upload_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `upload_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `upload_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `upload_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `upload_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `upload_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `upload_evidence` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the recomputed hash differs from the device-computed hash → expect `E_CONFLICT_VERSION`. the item moves to integrity_failed and the content IS retained. Discarding it would destroy the only copy over what is far more often a transfer fault than a substitution

**T-018** Cause: tenant storage quota exceeded → expect `E_QUOTA`, message: 'Plan limit reached.'. the item stays pending on the device and the tenant_owner is told, because the alternative is silently losing evidence to a billing condition

**T-019** Cause: storage backend unavailable → expect `E_DEPENDENCY`. retried with backoff. The item stays pending and its pending clock keeps running, so a long backend outage surfaces as pending-upload alerts rather than as silence

**T-020** Cause: the item was expired or redacted while pending → expect `E_PRECONDITION`. the upload is refused and the device is told to discard, and the fact that content existed and was not stored is recorded on the tombstone

**T-021** Cause: a device uploading beyond the per-device rate → expect `E_RATE_LIMIT`. throttled rather than refused. A device syncing a fortnight of backlog is legitimate and must not be blocked; it must simply not saturate the connection for everybody else at that location

## Edge cases

**T-022** (EC-01) A device uploading a fortnight of backlog after a long outage. Throttled, ordered oldest first, and the owning mutations replay with their sessions atomically. Ordering newest first would leave the oldest and most disputed evidence until last, which is exactly backwards.

**T-023** (EC-02) An upload arriving after the owning record has been completed and even invoiced. Accepted and attached. The record is updated to show that its evidence is now present, and where a billable outcome was emitted with an evidence-overridden marker, that marker is NOT retrospectively cleared, because the invoice went out saying what it said.

**T-024** (EC-03) A handset lost before uploading. The pending items become permanently unrecoverable at the critical threshold and the owning records are marked as having evidence that will never arrive. This is recorded plainly rather than being allowed to look like evidence that was never required.

**T-025** (EC-04) Two devices uploading the same item id, which can only happen if a device image was cloned. The first upload wins, the second is compared by hash, and a mismatch raises a security alert rather than an integrity one, because identical ids with different content is not a transfer fault.

**T-026** (EC-05) Upload of an item whose session was abandoned. Accepted and stored as orphaned. The bytes exist and somebody captured them, and the abandoned session is the record of why they are not attached to anything.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
