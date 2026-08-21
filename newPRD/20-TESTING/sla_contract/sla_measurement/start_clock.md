---
doc_id: TEST-START_CLOCK
title: Test catalogue — Start a service-level clock
generated: true
source_model: _model/capabilities/sla_contract.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Start a service-level clock

*This document is generated. Edit `_model/capabilities/sla_contract.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `start_clock` is invoked by an authorised actor, then the declared records are created/updated and events ['sla.clock_started'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `start_clock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `start_clock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `start_clock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `start_clock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `start_clock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `start_clock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `start_clock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `start_clock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `start_clock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `start_clock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `start_clock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `start_clock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `start_clock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `start_clock` succeeds. 

## Tenant isolation

**T-016** A principal in tenant A invoking `start_clock` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: no active contract covers the subject → expect `E_PRECONDITION`. no measurement is created and the fact is recorded against the subject as unmeasured, so that a record outside all contracts is visible rather than silently unmeasured

**T-018** Cause: target_unit is business_hours and no calendar resolves → expect `E_PRECONDITION`. REFUSED rather than falling back to wall hours. The fallback would make the target roughly three times easier and the resulting report would show excellent performance against a target nobody is meeting

**T-019** Cause: a running measurement already exists → expect `E_CONFLICT_UNIQUE`. returns the existing measurement

**T-020** Cause: started_at more than clock_backdate_limit_minutes in the past → expect `E_VALIDATION`. accepted with the backdating recorded, because offline replay legitimately produces late start events and refusing them would leave the record unmeasured entirely

**T-021** Cause: the calendar service is unavailable → expect `E_DEPENDENCY`. the measurement is created with target_at null and a recompute is queued. A clock with no deadline still records elapsed time, and the deadline can be established later; refusing the clock entirely would lose the start time

## Edge cases

**T-022** (EC-01) Two service levels on one contract both matching one subject - a first-response target and a resolution target. Both measurements are created and run concurrently. This is the normal case and the reason the unique index is per level rather than per subject.

**T-023** (EC-02) A start event arriving for a subject whose contract activated after the subject was created. The measurement starts from the event time, not from the contract activation, and contract activation lists pre-existing open records rather than retroactively binding them. Retroactively starting clocks on work already in progress creates breaches nobody could have prevented.

**T-024** (EC-03) Offline replay delivering a start event days late. The clock starts at the claimed occurred_at and the target is computed from there, so a deadline may already have passed at the moment the clock is created. It records as breached immediately, which is correct - the obligation existed regardless of when the system heard about it.

**T-025** (EC-04) A subject that moves location mid-measurement, changing which calendar applies. The calendar resolved at start is frozen, and the move is recorded on the measurement. Re-resolving would move a deadline somebody has already been told.

**T-026** (EC-05) The contract is suspended while the clock runs. The clock continues. Suspending a commercial relationship does not discharge an obligation on work already accepted, and this is stated in the transition side effects rather than left to inference.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
