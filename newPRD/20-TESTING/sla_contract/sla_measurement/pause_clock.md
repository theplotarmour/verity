---
doc_id: TEST-PAUSE_CLOCK
title: Test catalogue — Pause a service-level clock
generated: true
source_model: _model/capabilities/sla_contract.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Pause a service-level clock

*This document is generated. Edit `_model/capabilities/sla_contract.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `pause_clock` is invoked by an authorised actor, then the declared records are created/updated and events ['sla.clock_paused'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `pause_clock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `pause_clock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `pause_clock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `pause_clock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `pause_clock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `pause_clock` succeeds. 

**T-008** As `supervisor` (Site Supervisor), invoking `pause_clock` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `pause_clock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `pause_clock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `pause_clock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `pause_clock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `pause_clock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `pause_clock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `pause_clock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `pause_clock` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the reason is not in pausable_reason_keys → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. the response includes the permitted reasons so the caller can present them. This refusal is the mechanism that makes the contract the authority on pausing, and it is the single most important guard in this capability

**T-018** Cause: max_pause_minutes is already exhausted → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. names the ceiling and the minutes already used

**T-019** Cause: the measurement is already paused → expect `E_PRECONDITION`. 2xx no-op

**T-020** Cause: the measurement has stopped → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'.

**T-021** Cause: paused_at before started_at or in the future → expect `E_VALIDATION`. clamped to now with the clamping recorded, because a pause backdated before the clock started would produce negative elapsed time

## Edge cases

**T-022** (EC-01) A pause reason that the operational capability considers legitimate and the contract does not. Refused, and the refusal is surfaced to the operator with the permitted reasons. This is the designed friction - the alternative is a work order that can pause its own clock and therefore meet any target.

**T-023** (EC-02) The pause ceiling being reached while the underlying blocker persists. The clock resumes automatically and the forced resume is recorded distinctly from a voluntary one. The operator is told, because from their point of view a blocked record has just started accruing against a deadline again and they need to escalate rather than wait.

**T-024** (EC-03) Several pauses in one measurement. Fully supported; intervals accumulate. The concentration monitor looks at reasons across measurements rather than within one, because one long pause and six short ones for the same reason are the same finding.

**T-025** (EC-04) Pausing a measurement whose subject is in a state the operational capability considers active. Permitted - pausing is a contractual statement about the clock, not an operational statement about the work, and conflating them is why the two are separate capabilities.

**T-026** (EC-05) A pause applied while the counterparty is watching a live status through the customer surface. The pause and its reason category are visible to them, the free-text note is not. A clock that visibly stops with no reason shown is worse for trust than one that keeps running.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
