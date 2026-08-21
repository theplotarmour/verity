---
doc_id: TEST-SUBMIT_WORK_ORDER
title: Test catalogue — Raise a work order
generated: true
source_model: _model/capabilities/work_order.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Raise a work order

*This document is generated. Edit `_model/capabilities/work_order.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `submit_work_order` is invoked by an authorised actor, then the declared records are created/updated and events ['work_order.submitted'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `submit_work_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `submit_work_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `submit_work_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `submit_work_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `submit_work_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `submit_work_order` succeeds. 

**T-008** As `supervisor` (Site Supervisor), invoking `submit_work_order` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `submit_work_order` succeeds. 

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `submit_work_order` succeeds. 

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `submit_work_order` succeeds. 

**T-012** As `consumer` (Consumer (B2C)), invoking `submit_work_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `submit_work_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `submit_work_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `submit_work_order` succeeds. 

## Tenant isolation

**T-016** A principal in tenant A invoking `submit_work_order` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: neither subject nor location supplied → expect `E_VALIDATION`, message: 'Say where or what this is for.'.

**T-018** Cause: the work_type is not active → expect `E_PRECONDITION`, message: 'This kind of work is not available.'.

**T-019** Cause: the work_type requires evidence and the evidence_capture port is unbound → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. refused at submission rather than at completion, so the failure lands on somebody at a desk rather than on somebody at a location

**T-020** Cause: location_ref is outside the submitter's scope → expect `E_AUTHZ_SCOPE`, message: 'Not found.'.

**T-021** Cause: the sla_clock port is bound but unavailable → expect `E_DEPENDENCY`. the order COMMITS with due_source=none and the clock start is queued for retry. Refusing to accept work because a clock service is down is the wrong trade - the work still needs doing

**T-022** Cause: open work order limit reached → expect `E_QUOTA`, message: 'Plan limit reached.'.

**T-023** Cause: more than submit_burst per source per minute → expect `E_RATE_LIMIT`, message: 'Too many attempts. Try again shortly.'. catches a misconfigured integration replaying a queue

## Edge cases

**T-024** (EC-01) Submitted offline by somebody standing at a location. Queued, and the reference number is provisional on the device and replaced by the authoritative one on sync, with the provisional number retained on the record - because the person will have written the provisional number on a paper docket and somebody will search for it.

**T-025** (EC-02) Two orders submitted for the same subject and the same fault by two different people. Both are created, and the duplicate outcome exists precisely so one can be closed honestly rather than deleted. Auto-merging is not offered, because two reports of the same symptom are sometimes two faults.

**T-026** (EC-03) Submitted by a customer_contact through the customer surface. Arrives in draft rather than ready when the tenant requires triage, and in ready when it does not. Which of the two is tenant configuration, because a business with a contractual response time cannot afford a triage step and a business without one cannot afford to dispatch on an unverified report.

**T-027** (EC-04) Submitted with requested_for_at in the past. Accepted. Retrospective recording of work already done is a real and frequent need, and the record carries the gap between requested_for_at and created_at so that it is visible rather than disguised.

**T-028** (EC-05) A recurrence run submitting an order for a subject that has since been retired. The work_subject port reports the subject unavailable and the order is created in draft with the reason attached, rather than being silently skipped. A silently skipped maintenance order is a maintenance plan that quietly stops running.

## Idempotency and concurrency

**T-029** Replaying the same request with the same idempotency key produces one effect and one event.

**T-030** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-031** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-032** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 32**
