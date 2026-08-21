---
doc_id: TEST-CANCEL_BOOKING
title: Test catalogue — Cancel a booking
generated: true
source_model: _model/capabilities/booking.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Cancel a booking

*This document is generated. Edit `_model/capabilities/booking.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `cancel_booking` is invoked by an authorised actor, then the declared records are created/updated and events ['booking.cancelled', 'booking.slot_released'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `cancel_booking` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `cancel_booking` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `cancel_booking` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `cancel_booking` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `cancel_booking` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `cancel_booking` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `cancel_booking` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `cancel_booking` succeeds. 

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `cancel_booking` succeeds. 

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `cancel_booking` succeeds. 

**T-012** As `consumer` (Consumer (B2C)), invoking `cancel_booking` succeeds. 

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `cancel_booking` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `cancel_booking` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `cancel_booking` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `cancel_booking` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: reason empty → expect `E_VALIDATION`, message: 'Give a reason.'.

**T-018** Cause: the booking is already completed → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. the correct path is a refund or credit through billing

**T-019** Cause: a consumer cancelling a booking that is not theirs → expect `E_AUTHZ_SCOPE`, message: 'Not found.'.

**T-020** Cause: waive_charge set by a principal without view_financial → expect `E_AUTHZ_FIELD`. the waiver is dropped and the charge applies. A person who cannot see money should not be able to forgive it

**T-021** Cause: the payment provider is unavailable for a refund → expect `E_DEPENDENCY`. the cancellation COMMITS and the refund is queued with its reference. A cancellation blocked by a payment outage leaves a slot held for a person who has already left

## Edge cases

**T-022** (EC-01) Cancellation by staff after arrival, which is the tenant's failure rather than the person's. The policy's charge is never applied on this path, regardless of timing, and the model enforces that by the actor guard on the transition rather than by expecting a staff member to remember to waive it.

**T-023** (EC-02) Cancellation inside the free window but for a booking that was already rescheduled twice. The reschedule count and the cancellation are separate terms, and the model applies both independently rather than compounding them, because a compounded charge is one nobody predicted from the disclosure.

**T-024** (EC-03) A cancellation that releases a slot nobody is waiting for and which is too soon to refill. Recorded, and the lost-slot cost is visible in reporting. This is what a business actually wants to know about late cancellation, more than the charge itself.

**T-025** (EC-04) Cancelling one booking of several made together by one party. Each booking is independent; there is no group cancellation in this model, and a person cancelling a group has to cancel each. This is a deliberate simplification and is flagged in open_questions rather than presented as a feature.

**T-026** (EC-05) Cancellation of a booking whose deposit was captured under a policy that has since been archived. The archived policy still governs, because bookings keep the terms they were shown. This is why policies are archived and never deleted.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
