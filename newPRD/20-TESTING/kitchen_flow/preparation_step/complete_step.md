---
doc_id: TEST-COMPLETE_STEP
title: Test catalogue — Mark a step done
generated: true
source_model: _model/capabilities/kitchen_flow.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Mark a step done

*This document is generated. Edit `_model/capabilities/kitchen_flow.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `complete_step` is invoked by an authorised actor, then the declared records are created/updated and events ['preparation.step_completed', 'preparation.ticket_ready'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `complete_step` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `complete_step` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `complete_step` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `complete_step` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `complete_step` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `complete_step` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `complete_step` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `complete_step` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `complete_step` succeeds. 

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `complete_step` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `complete_step` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `complete_step` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `complete_step` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `complete_step` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `complete_step` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the step is already complete → expect `E_PRECONDITION`. 2xx no-op, and the display simply shows it as done

**T-018** Cause: the step was never started → expect `E_PRECONDITION`. completed anyway, with started_at set equal to completed_at and the step marked as never-timed. Refusing would mean somebody who did the work cannot record it, and an untimed record is better than no record

**T-019** Cause: the stock sink is bound but unavailable → expect `E_DEPENDENCY`. the completion COMMITS and the consumption is queued. Blocking a station display on a stock service is how an entire operation stops because of a background system

**T-020** Cause: the ticket was cancelled while the device was offline → expect `E_OFFLINE_STALE`. the completion is retained and recorded as work done on a cancelled ticket, with its elapsed time, so the cost is visible. It is never silently discarded - somebody did the work

**T-021** Cause: completed_at is in the future by more than clock_skew_tolerance_seconds → expect `E_VALIDATION`. clamped to server receipt time with the skew recorded, because a station device with a wrong clock would otherwise produce negative elapsed times

## Edge cases

**T-022** (EC-01) Completed offline and synced hours later. elapsed_seconds is computed from the device's own start and completion times, which is correct - the work took what it took - while received_at and the sync lag come from the server. Computing elapsed from server timestamps would make every offline step appear to take hours.

**T-023** (EC-02) The last step of a ticket completing while another device is holding a different step open. Readiness is recomputed from the step set under the lock, so the ticket does not become ready. The display on the completing device shows the outstanding step, because the person's next question is what is still missing.

**T-024** (EC-03) Completion of a step whose ticket has been recalled. Recorded against the original ticket, which is now terminal, and flagged. The work happened and hiding it would understate what a recall costs.

**T-025** (EC-04) A station completing steps far faster than plausible. Not blocked - blocking a station display is unacceptable - and reported as a pattern by the complete stuck policy. The remedy is a conversation, and the model's job is to make the conversation possible.

**T-026** (EC-05) Completion with evidence attached, for a step where quality is disputed later. The evidence and the completion queue together as one unit offline, for the same reason work orders queue their evidence with their completion.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
