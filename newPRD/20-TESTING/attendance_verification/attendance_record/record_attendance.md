---
doc_id: TEST-RECORD_ATTENDANCE
title: Test catalogue — Record a start or an end
generated: true
source_model: _model/capabilities/attendance_verification.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Record a start or an end

*This document is generated. Edit `_model/capabilities/attendance_verification.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `record_attendance` is invoked by an authorised actor, then the declared records are created/updated and events ['attendance.claimed', 'attendance.evidence_recorded'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `record_attendance` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `record_attendance` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `record_attendance` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `record_attendance` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `record_attendance` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `record_attendance` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `record_attendance` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `record_attendance` succeeds. 

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `record_attendance` succeeds. 

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `record_attendance` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `record_attendance` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `record_attendance` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `record_attendance` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `record_attendance` succeeds. 

## Tenant isolation

**T-016** A principal in tenant A invoking `record_attendance` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: position supplied without position_accuracy_m → expect `E_VALIDATION`. the position is DISCARDED and the record proceeds with strength=device_only. A position with no stated accuracy cannot be evaluated honestly, and guessing the accuracy silently bypasses the accuracy floor

**T-018** Cause: the person is not an active resource → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. recorded anyway as an orphan claim requiring supervisor triage where the tenant enables it, because a person who turns up on their first day before their record is activated has still turned up

**T-019** Cause: an open record already exists at another location → expect `E_CONFLICT_UNIQUE`, message: 'You are already signed in somewhere else.'. both records are retained and flagged, per the concurrency note

**T-020** Cause: asserted_at more than max_backdate_hours in the past → expect `E_VALIDATION`, message: 'That is too far back to record here.'. the correct path is a supervisor-attested record, which carries a different evidence strength and is separately reported. Allowing arbitrary backdating on the self-service path is how a register becomes fiction

**T-021** Cause: the presence_evidence port is bound but unavailable → expect `E_DEPENDENCY`. the record COMMITS with verdict not_evaluated and strength device_only. Refusing to record attendance because a geofence service is down would leave a person unable to prove they were there

**T-022** Cause: more than attendance_burst_per_device per minute → expect `E_RATE_LIMIT`, message: 'Too many attempts. Try again shortly.'. a shared terminal at shift change legitimately produces a high rate, so the limit is per device and generous, and is intended to catch a replaying integration rather than a queue of people

## Edge cases

**T-023** (EC-01) Recorded offline with no signal, which is the normal case at many locations. The record and its evidence are queued as one unit. occurred_at is the device's claimed time, recorded_at is the server's, and sync_lag_minutes is retained. Records arriving in a burst days later are flagged for review, never rejected, because a broken handset and a fabrication produce the same shape and only a human can distinguish them.

**T-024** (EC-02) A device whose clock is wrong. asserted_at is recorded as claimed and a clock_skew marker is computed against the server's receipt time. It is never silently corrected, because the skew is the only evidence that the claim is unreliable.

**T-025** (EC-03) Somebody covering for another person, arriving with the absent person's commitment. Recorded against the substitute with substitution_of_resource_ref set. The absent person's own record is NOT auto-created and NOT auto-voided, because whether they were absent is a separate fact that somebody must record deliberately.

**T-026** (EC-04) Recorded by a supervisor on behalf of a person with no device. Fully supported, strength=supervisor_attested, and the person is notified that a record was made about them. The notification is mandatory_operational and not suppressible, because the alternative is a system where somebody's hours are recorded by another person without their knowledge.

**T-027** (EC-05) A geofence verdict of inconclusive because the person is inside a building. Recorded as inconclusive, never as outside, and the record's strength is geofence_inconclusive - which is above self_declared and below geofence_confirmed. The tenant's required strength decides whether that is sufficient, and it is a configured decision rather than an accident of GPS.

**T-028** (EC-06) A start recorded with no matching end because the person's phone died. This is the claimed stuck state and its policy governs. What matters here is that the start is not voided and not capped automatically - both would destroy or fabricate evidence about a period somebody worked.

**T-029** (EC-07) Attendance with no commitment at all - somebody called in at short notice before the roster caught up. Fully supported with commitment_ref null. Lateness and no-show become uncomputable for that record and it is still payable and billable, which is the correct trade.

## Idempotency and concurrency

**T-030** Replaying the same request with the same idempotency key produces one effect and one event.

**T-031** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-032** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-033** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 33**
