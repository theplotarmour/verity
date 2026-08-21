---
doc_id: TEST-WRITE_AUDIT_RECORD
title: Test catalogue — Record that something happened
generated: true
source_model: _model/capabilities/core_audit.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Record that something happened

*This document is generated. Edit `_model/capabilities/core_audit.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `write_audit_record` is invoked by an authorised actor, then the declared records are created/updated and events [] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `write_audit_record` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `write_audit_record` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `write_audit_record` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `write_audit_record` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `write_audit_record` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `write_audit_record` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `write_audit_record` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `write_audit_record` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `write_audit_record` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `write_audit_record` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `write_audit_record` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `write_audit_record` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `write_audit_record` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `write_audit_record` succeeds. 

## Tenant isolation

**T-016** A principal in tenant A invoking `write_audit_record` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the audit write fails for any reason → expect `E_INTERNAL`, message: 'Something went wrong. The team has been notified.'. THE BUSINESS TRANSACTION ROLLS BACK. This is the single most consequential decision in this capability - an action that cannot be recorded does not happen. The alternative, committing the business write and losing the audit row, produces a system whose audit trail silently has holes exactly where something went wrong

**T-018** Cause: on_behalf_of_principal_id present without a delegation or impersonation authority_kind → expect `E_VALIDATION`. internal contract violation, raised to platform_operator

**T-019** Cause: called outside a transaction → expect `E_PRECONDITION`. a programming error, caught in test rather than in production, and the reason the port contract specifies synchronous transactional delivery

## Edge cases

**T-020** (EC-01) Offline replay: occurred_at is the device's claimed business time, recorded_at is server time, and source is offline_replay. The gap between them is retained and is queryable, because a fortnight-old attendance record arriving in one burst is the shape of a fraud pattern and the shape of a phone that was broken. Verity records the fact and does not judge it.

**T-021** (EC-02) A device clock claiming an occurred_at in the future. Recorded as claimed, flagged with a clock_skew marker computed against recorded_at, and never silently corrected. Correcting it would destroy the only evidence that the device's clock was wrong.

**T-022** (EC-03) A high-volume automation writing thousands of rows in one transaction, for example a bulk import. Rows are chained in a single pass inside the transaction and one digest window absorbs them. The audit query surface must therefore support collapsing a correlation_id into one summary row that expands, or a bulk import makes the audit trail unreadable for that day.

**T-023** (EC-04) A field marked sensitive appears in before and after. It is recorded in full. Projection happens on read. This is stated explicitly because the instinct to redact at write time is strong and is wrong.

**T-024** (EC-05) An action whose subject is deleted later by a retention job. subject_label_at_time preserves the human meaning of the row. The audit row is never cascade-deleted - stated in the kernel's deletion semantics and restated here because it is the single most common thing an implementer gets wrong.

**T-025** (EC-06) Two capabilities recording the same business event from both sides, for example a work order completion and a billing event. Both rows are written and share a correlation_id. Deduplicating them would lose the fact that two different subsystems observed it.

## Idempotency and concurrency

**T-026** Replaying the same request with the same idempotency key produces one effect and one event.

**T-027** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-028** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-029** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 29**
