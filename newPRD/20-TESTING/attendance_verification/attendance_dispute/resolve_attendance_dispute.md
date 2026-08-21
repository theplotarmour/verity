---
doc_id: TEST-RESOLVE_ATTENDANCE_DISPUTE
title: Test catalogue — Resolve a disputed attendance record
generated: true
source_model: _model/capabilities/attendance_verification.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Resolve a disputed attendance record

*This document is generated. Edit `_model/capabilities/attendance_verification.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `resolve_attendance_dispute` is invoked by an authorised actor, then the declared records are created/updated and events ['attendance.dispute_resolved'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `resolve_attendance_dispute` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `resolve_attendance_dispute` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `resolve_attendance_dispute` succeeds. 

**T-005** As `tenant_admin` (Tenant Administrator), invoking `resolve_attendance_dispute` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `resolve_attendance_dispute` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `resolve_attendance_dispute` succeeds. 

**T-008** As `supervisor` (Site Supervisor), invoking `resolve_attendance_dispute` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `resolve_attendance_dispute` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `resolve_attendance_dispute` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `resolve_attendance_dispute` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `resolve_attendance_dispute` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `resolve_attendance_dispute` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `resolve_attendance_dispute` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `resolve_attendance_dispute` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `resolve_attendance_dispute` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the resolver raised the dispute → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. deciding one's own dispute is not a resolution, and the message is deliberately not specific enough to teach a workaround

**T-018** Cause: outcome_reason empty → expect `E_VALIDATION`, message: 'Write the reason. Both parties will see it.'.

**T-019** Cause: outcome partially_upheld with no resulting period supplied → expect `E_VALIDATION`, message: 'Say what the agreed hours are.'.

**T-020** Cause: financial_effect_minor supplied without view_financial → expect `E_AUTHZ_FIELD`. dropped and reported

**T-021** Cause: the containing period locked while the dispute was open → expect `E_PRECONDITION`. resolution still proceeds and produces a post-lock adjustment rather than editing the locked record. A dispute must never be blocked by a period closing, because the period closing is frequently what prompted it

## Edge cases

**T-022** (EC-01) A dispute upheld after the person has already been paid the lower amount. The adjustment is written against the locked record and flows to the next payroll input as a correction. The notification states plainly when the correction will be paid, because the question the person is actually asking is when, not whether.

**T-023** (EC-02) A dispute raised by a counterparty against hours already billed. Resolution produces an adjustment with affects_billing true and affects_pay false, so a credit to a counterparty does not silently reduce somebody's wages. This is the whole reason the two flags are independent.

**T-024** (EC-03) Both parties rejecting the proposed outcome. Escalation, not resolution. There is no mechanism inside Verity that compels agreement, and the model does not pretend otherwise - the escalated state exists so that the disagreement is visible to somebody with the authority to end it.

**T-025** (EC-04) A dispute where the evidence is inconclusive on both sides, which is the common case with indoor geofences. The resolver must choose and record why. The model deliberately offers no default, because a default here is a rule about who loses when nobody can prove anything, and that rule belongs to the business rather than to the software.

**T-026** (EC-05) A pattern of disputes concentrated at one location. Surfaced to ops_manager as a record-quality signal about the capture process at that location, not as a performance signal about the people there. Which of the two it is presented as determines whether the data gets fixed or the workforce gets blamed.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
