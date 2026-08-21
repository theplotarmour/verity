---
doc_id: TEST-COMPLETE_WORK
title: Test catalogue — Complete the work
generated: true
source_model: _model/capabilities/work_order.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Complete the work

*This document is generated. Edit `_model/capabilities/work_order.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `complete_work` is invoked by an authorised actor, then the declared records are created/updated and events ['work_order.completed', 'work_order.outcome_recorded'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `complete_work` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `complete_work` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `complete_work` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `complete_work` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `complete_work` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `complete_work` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `complete_work` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `complete_work` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `complete_work` succeeds. 

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `complete_work` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `complete_work` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `complete_work` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `complete_work` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `complete_work` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `complete_work` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: a blocking checklist item is unanswered → expect `E_PRECONDITION`, message: 'Answer the required checks first.'. names the items, and the field surface scrolls to the first one rather than only reporting

**T-018** Cause: the evidence requirement is unmet and no override reason was given → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. names what is missing - for example two photos required, one attached

**T-019** Cause: outcome is not_recorded → expect `E_VALIDATION`, message: 'Choose what the outcome was.'.

**T-020** Cause: cost fields supplied without view_financial → expect `E_AUTHZ_FIELD`. dropped and reported. Labour and travel minutes are NOT financial fields and are always recordable, because the person doing the work must be able to record their own time

**T-021** Cause: the order was cancelled or completed by somebody else while the device was offline → expect `E_OFFLINE_STALE`, message: 'This was changed while you were offline.'. the queued completion is NOT discarded. It is held in the conflict queue with its evidence intact, because the work was done and the evidence is the only record of it

**T-022** Cause: the stock_movement_sink is bound but unavailable → expect `E_DEPENDENCY`, message: 'A required service is unavailable.'. the completion is REFUSED rather than committing without the stock movement, because a completion that consumed parts without recording them silently corrupts stock and the error compounds daily. This is the opposite trade from the sla_clock case above, and the difference is that a clock can be applied retroactively and a stock movement cannot

**T-023** Cause: the checklist template version changed → expect `E_CONFLICT_VERSION`. impossible by construction - the order captured its template version at submission. Listed here because the naive implementation resolves the template at completion time and would produce exactly this error

## Edge cases

**T-024** (EC-01) Completed offline with photos on a device with no signal. The completion and its evidence are queued together as one unit and are replayed atomically. Evidence that syncs without its completion, or a completion that syncs without its evidence, is the failure mode that makes field evidence untrustworthy, and the queue treats them as one item for that reason.

**T-025** (EC-02) Completed with outcome=not_possible. Fully first-class. No billable event is emitted by default, the requesting party is told, and a follow-up order is offered but never created automatically. A system that only offers a successful outcome gets a successful outcome recorded for every visit, including the ones where nothing was done.

**T-026** (EC-03) Completed with an evidence override. Permitted where the tenant allows it, always with a reason, always reported, and the resulting billable event carries a marker that the evidence requirement was overridden - so that a counterparty disputing the line can be shown the truth rather than a claim.

**T-027** (EC-04) A completion arriving days late from a device that was offline. occurred_at is the device's claimed completion time and recorded_at is the server's, and both are retained. Where the gap exceeds late_sync_alert_hours the completion is flagged for review rather than blocked, because both a broken phone and a fabricated record produce the same shape and only a human can tell them apart.

**T-028** (EC-05) Labour minutes exceeding the assignment window by a large margin. Accepted and flagged. Refusing would make an honest overrun unrecordable; accepting silently would let it flow into billing and payroll unnoticed.

**T-029** (EC-06) Parts recorded while the stock sink is unbound. Stored as free text on the order and carried into the billable event as evidence. When a stock capability is later bound, historical free-text parts are NOT retroactively converted into stock movements, because inventing a stock history from free text would corrupt the opening balance of the new system.

## Idempotency and concurrency

**T-030** Replaying the same request with the same idempotency key produces one effect and one event.

**T-031** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-032** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-033** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 33**
