---
doc_id: TEST-RECORD_UNPLANNED_ABSENCE
title: Test catalogue — Record that somebody is not coming in
generated: true
source_model: _model/capabilities/people.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Record that somebody is not coming in

*This document is generated. Edit `_model/capabilities/people.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `record_unplanned_absence` is invoked by an authorised actor, then the declared records are created/updated and events ['absence.recorded', 'member.became_unavailable'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `record_unplanned_absence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `record_unplanned_absence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `record_unplanned_absence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `record_unplanned_absence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `record_unplanned_absence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `record_unplanned_absence` succeeds. 

**T-008** As `supervisor` (Site Supervisor), invoking `record_unplanned_absence` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `record_unplanned_absence` succeeds. 

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `record_unplanned_absence` succeeds. 

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `record_unplanned_absence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `record_unplanned_absence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `record_unplanned_absence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `record_unplanned_absence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `record_unplanned_absence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `record_unplanned_absence` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: an overlapping absence already exists → expect `E_CONFLICT_UNIQUE`, message: 'There is already an absence recorded for this period.'. shows the existing record

**T-018** Cause: ends_at before starts_at → expect `E_VALIDATION`, message: 'The end has to be after the start.'.

**T-019** Cause: the member is in state ended → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'.

**T-020** Cause: reason_text supplied by a principal without view_sensitive → expect `E_AUTHZ_FIELD`. the field is dropped and the recorder is told. A dispatcher recording an absence by phone should not be able to write health information into a field they cannot read back

**T-021** Cause: the backfill_request port is bound but unavailable → expect `E_DEPENDENCY`. the absence still commits and the backfill signal is queued for retry. An absence that fails to record because a downstream service is down leaves a commitment looking staffed when it is not, which is the worst available outcome

## Edge cases

**T-022** (EC-01) Recorded offline by a supervisor with no signal. Queued, and the member is marked unavailable locally so the supervisor's own view is correct. On sync the backfill signal fires late, which is stated on the record - the gap between notified_at and recorded_at is retained and is exactly what a later dispute about cover examines.

**T-023** (EC-02) Recorded by somebody other than the member, which is the normal case. The recording principal is captured separately from the member, and the member is notified that an absence was recorded for them - because an absence recorded against the wrong person is common at shift change and only the wrongly-marked person will notice.

**T-024** (EC-03) An absence recorded for a period that has already partly elapsed and during which the person actually worked. The overlap with recorded presence is detected and surfaced rather than silently resolved. Verity does not decide whether the attendance or the absence is the truth; it presents both and makes somebody choose, because that choice has a pay consequence.

**T-025** (EC-04) An absence whose kind is medical recorded by a dispatcher. The kind is visible, the reason is not writable by them, and the member and supervisor are told so that the sensitive detail can be added by somebody permitted to hold it.

**T-026** (EC-05) Cancelling an absence after cover was arranged. The cover is NOT automatically released. The dispatcher is told and decides, because releasing a reliever who has already travelled to a location is a cost somebody has to own deliberately.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
