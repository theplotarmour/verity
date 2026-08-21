---
doc_id: TEST-CONFIRM_BOOKING
title: Test catalogue — Confirm a booking
generated: true
source_model: _model/capabilities/booking.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Confirm a booking

*This document is generated. Edit `_model/capabilities/booking.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `confirm_booking` is invoked by an authorised actor, then the declared records are created/updated and events ['booking.confirmed'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `confirm_booking` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `confirm_booking` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `confirm_booking` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `confirm_booking` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `confirm_booking` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `confirm_booking` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `confirm_booking` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `confirm_booking` succeeds. 

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `confirm_booking` succeeds. 

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `confirm_booking` succeeds. 

**T-012** As `consumer` (Consumer (B2C)), invoking `confirm_booking` succeeds. 

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `confirm_booking` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `confirm_booking` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `confirm_booking` succeeds. 

## Tenant isolation

**T-016** A principal in tenant A invoking `confirm_booking` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the hold has expired → expect `E_PRECONDITION`, message: 'That time is no longer held. Please choose again.'. the nearest alternatives are offered, including the original slot if it happens to still be free

**T-018** Cause: neither a party nor a contact channel supplied → expect `E_VALIDATION`, message: 'We need a way to reach you.'.

**T-019** Cause: a deposit is required and the payment failed → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. the booking moves to pending_confirmation and the hold is retained for the payment window rather than being released immediately, because releasing on the first payment failure loses the slot for somebody who is retrying their card

**T-020** Cause: the notification provider is unavailable → expect `E_DEPENDENCY`. the booking is CONFIRMED and the confirmation message is queued. Refusing to confirm because a message could not be sent would mean the person tries again and creates a second booking

**T-021** Cause: the contact channel is suppressed or has refused consent for this purpose → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. refused for a self-service booking, because a confirmed booking that cannot be confirmed to the person is a slot held for somebody who does not know they hold it. Permitted for a staff-entered booking, where the staff member is expected to tell them directly, and recorded as such

## Edge cases

**T-022** (EC-01) The booking party and the subject party being different, which is the normal case for a booking made on somebody else's behalf. Both are notified where both have consenting channels, the confirmation to the booker and the reminder to the subject. Sending everything to the booker is how the person who actually turns up never receives a reminder.

**T-023** (EC-02) Confirmation arriving after the slot has started, from a queued integration message. Accepted and immediately flagged, because refusing it would leave the record absent entirely and somebody may well be standing there.

**T-024** (EC-03) A booking confirmed with no resource assignable. Confirmed, and the dispatcher is told immediately at high priority. The alternative - refusing the confirmation - means turning away a person for a slot that is nominally available, and the tenant would rather know and fix it. This is the confirmed stuck policy's first monitored exception and it is the most damaging quiet failure here.

**T-025** (EC-04) access_requirements supplied by a person through a self-service surface. Stored gated by view_sensitive and always released to the assigned resource at the time of service. A field that the person delivering the service cannot read is a field that should not have been collected.

**T-026** (EC-05) Confirmation of a booking created from a waiting-list offer. The entry converts in the same transaction, so a person cannot both convert an offer and have the entry remain live to be offered another slot.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
