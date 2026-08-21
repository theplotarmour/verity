---
doc_id: TEST-SETTLE_ATTENDANCE
title: Test catalogue — Settle attendance for pay and billing
generated: true
source_model: _model/capabilities/attendance_verification.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Settle attendance for pay and billing

*This document is generated. Edit `_model/capabilities/attendance_verification.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `settle_attendance` is invoked by an authorised actor, then the declared records are created/updated and events ['attendance.settled'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `settle_attendance` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `settle_attendance` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `settle_attendance` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `settle_attendance` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `settle_attendance` succeeds. 

**T-007** As `ops_manager` (Operations / Area Manager), invoking `settle_attendance` succeeds. 

**T-008** As `supervisor` (Site Supervisor), invoking `settle_attendance` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `settle_attendance` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `settle_attendance` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `settle_attendance` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `settle_attendance` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `settle_attendance` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `settle_attendance` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `settle_attendance` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `settle_attendance` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: an open dispute references the record → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. names the dispute and its reviewer

**T-018** Cause: evidence strength below the tenant requirement and no authorisation supplied → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. states the required strength and the strength actually held, so the supervisor knows what would fix it

**T-019** Cause: the agreed period differs from both the claim and the verified period with no adjustment recorded → expect `E_VALIDATION`, message: 'Record why the hours differ.'. settlement may not silently invent a third period. Any difference is an adjustment with a reason

**T-020** Cause: billable_minutes supplied without view_financial → expect `E_AUTHZ_FIELD`. dropped. payable_minutes is not gated, so a supervisor without financial access can still settle somebody's pay - which is the correct separation

**T-021** Cause: a bound sink is unavailable → expect `E_DEPENDENCY`, message: 'A required service is unavailable.'. settlement is REFUSED rather than committing without emitting. A settled record whose outcomes never reached billing or payroll is a person unpaid or a counterparty unbilled, discovered weeks later by manual reconciliation

**T-022** Cause: the containing period is already locked → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. the correct path is a post-lock adjustment

## Edge cases

**T-023** (EC-01) Payable and billable minutes differing legitimately - a person paid for a full period while a counterparty is billed only for the covered portion, or a rounding rule applying to one and not the other. Fully supported and is the reason the two are separate fields. A model with one number is wrong for one of the two parties every time they differ.

**T-024** (EC-02) Bulk settlement at period end across hundreds of records. Supported as a batch sharing one correlation_id, with each record settled individually so one failure does not roll back the rest, and a summary showing exactly which records did not settle and why. A bulk operation that reports only a count is one nobody can act on.

**T-025** (EC-03) Settling unverified because a location has no signal and never will. Permitted with a reason, reported, and the resulting billable outcome carries the unverified marker so that a counterparty disputing the line is shown the truth rather than an assertion.

**T-026** (EC-04) A rounding rule that always rounds in the tenant's favour. Expressible, and the model records the rounding as an explicit adjustment of kind rounding rather than folding it into the agreed period. Whether the rule is fair is not this capability's judgement; making it visible is.

**T-027** (EC-05) Settlement of a record whose commitment was later cancelled. Still settles. The person attended; a cancellation after the fact does not undo that, and the billable classification is a separate question for the contract.

## Idempotency and concurrency

**T-028** Replaying the same request with the same idempotency key produces one effect and one event.

**T-029** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-030** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-031** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 31**
