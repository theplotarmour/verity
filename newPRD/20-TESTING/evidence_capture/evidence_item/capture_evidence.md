---
doc_id: TEST-CAPTURE_EVIDENCE
title: Test catalogue — Capture evidence
generated: true
source_model: _model/capabilities/evidence_capture.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Capture evidence

*This document is generated. Edit `_model/capabilities/evidence_capture.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `capture_evidence` is invoked by an authorised actor, then the declared records are created/updated and events ['evidence.captured'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `capture_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `capture_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `capture_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `capture_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `capture_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `capture_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `capture_evidence` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `capture_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `capture_evidence` succeeds. 

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `capture_evidence` succeeds. 

**T-012** As `consumer` (Consumer (B2C)), invoking `capture_evidence` succeeds. 

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `capture_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `capture_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `capture_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `capture_evidence` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the session is closed or abandoned → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. the item is retained on the device as orphaned and offered for attachment to a new session, because somebody took the photograph

**T-018** Cause: the kind does not match the requirement → expect `E_VALIDATION`, message: 'field-specific'.

**T-019** Cause: position required and not available on the device → expect `E_VALIDATION`. the item is CAPTURED without a position and the requirement is marked unsatisfied. Refusing the capture because a position could not be obtained loses the photograph as well as the position

**T-020** Cause: device storage exhausted → expect `E_QUOTA`, message: 'There is no space left on this device.'. the surface offers to upload pending items first and states how many are waiting. This is a real and frequent condition on the devices in use and it is where evidence is most often lost

**T-021** Cause: content exceeds max_item_bytes → expect `E_VALIDATION`. the item is downscaled on the device to the configured maximum and BOTH the original hash and the downscaled hash are recorded, so the transformation is disclosed rather than hidden. An undisclosed transformation would make every hash comparison meaningless

## Edge cases

**T-022** (EC-01) Captured with no connectivity, which is the normal case. The item exists on the device with its hash computed locally and its server-side reference created at the next sync opportunity. Both timestamps are retained, and the gap is the single most useful field for judging a disputed capture.

**T-023** (EC-02) A device whose clock is wrong. captured_at is recorded as claimed and clock_skew_seconds is computed against the first server contact. It is never silently corrected, because the skew is the only evidence that the claimed time is unreliable, and correcting it would manufacture a timestamp.

**T-024** (EC-03) A photograph selected from a gallery rather than taken live. Recorded with from_live_capture false where the device reports it, and null where it cannot. A requirement demanding live capture is marked satisfied-without-provenance rather than satisfied, so that the tenant knows whether the control is real on the devices they actually issue.

**T-025** (EC-04) Capture of a signature. Stored as an image plus the stroke metadata where the device provides it, because the stroke timing is far stronger evidence than the resulting picture and it costs almost nothing to keep.

**T-026** (EC-05) A person refusing to be photographed. There is no mechanism to compel it. The requirement goes unsatisfied and the override path with a reason is what records why, which is the correct outcome - a system that has no way to record a refusal produces staff who photograph people who said no.

**T-027** (EC-06) Capture against a subject that has been deleted or cancelled since the session opened. The items are retained as orphaned rather than discarded, and reported. Somebody took them, and destroying them because a record was cancelled removes the evidence of what was actually there.

## Idempotency and concurrency

**T-028** Replaying the same request with the same idempotency key produces one effect and one event.

**T-029** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-030** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-031** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 31**
