---
doc_id: ACT-BOOKING-CANCEL_BOOKING
title: Action — Cancel a booking
generated: true
source_model: _model/capabilities/booking.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Cancel a booking

*This document is generated. Edit `_model/capabilities/booking.yaml`, not this file.*

**Entity:** `booking` · **Capability:** `booking`

## 1. Specification

### Who can perform it

- consumer
- customer_contact
- employee
- dispatcher
- supervisor

### Preconditions

- the booking is not already terminal
- a reason is supplied

### Inputs

- booking_id
- reason
- cancelled_by_role
- waive_charge
- waive_reason

### What is created

- a charge record where the policy produces one

### What is modified

- booking state
- the reservation released
- the deposit treated per policy
- the waiting list for that slot notified

### What events fire

- booking.cancelled
- booking.slot_released

### Who is notified

- **to**: the booking party and, where different, the subject party; **channel**: their consenting channel; **when**: always; **template**: booking_cancelled; **must_include**: ['reference', 'window', 'charge_applied_or_not', 'refund_position', 'who_cancelled']; **cost_class**: utility; **mandatory_operational**: True
- **to**: the highest-ranked matching waiting-list entries; **channel**: their consenting channel; **when**: a waiting list exists for the released slot; **template**: slot_available; **batching_policy**: one offer at a time, in rank order, never a broadcast
- **to**: the assigned resource; **channel**: push; **when**: within resource_notice_hours of the slot; **template**: booking_cancelled_short_notice

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

Cancellation releases the reservation and notifies the waiting list inside the same transaction, so the slot cannot be released without the queue being offered it, and the offer creates a hold rather than merely a message. Cancellation racing an arrival: the arrival wins, because somebody is physically present.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | reason empty | Give a reason. | False |  |
| `E_PRECONDITION` | 409 | the booking is already completed | This action is not available in the current state. | False | the correct path is a refund or credit through billing |
| `E_AUTHZ_SCOPE` | 404 | a consumer cancelling a booking that is not theirs | Not found. | False |  |
| `E_AUTHZ_FIELD` | 200 | waive_charge set by a principal without view_financial | *(silent)* | False | the waiver is dropped and the charge applies. A person who cannot see money should not be able to forgive it |
| `E_DEPENDENCY` | 424 | the payment provider is unavailable for a refund | *(silent)* | True | the cancellation COMMITS and the refund is queued with its reference. A cancellation blocked by a payment outage leaves a slot held for a person who has already left |

## 3. Edge cases

**EC-01.** Cancellation by staff after arrival, which is the tenant's failure rather than the person's. The policy's charge is never applied on this path, regardless of timing, and the model enforces that by the actor guard on the transition rather than by expecting a staff member to remember to waive it.

**EC-02.** Cancellation inside the free window but for a booking that was already rescheduled twice. The reschedule count and the cancellation are separate terms, and the model applies both independently rather than compounding them, because a compounded charge is one nobody predicted from the disclosure.

**EC-03.** A cancellation that releases a slot nobody is waiting for and which is too soon to refill. Recorded, and the lost-slot cost is visible in reporting. This is what a business actually wants to know about late cancellation, more than the charge itself.

**EC-04.** Cancelling one booking of several made together by one party. Each booking is independent; there is no group cancellation in this model, and a person cancelling a group has to cancel each. This is a deliberate simplification and is flagged in open_questions rather than presented as a feature.

**EC-05.** Cancellation of a booking whose deposit was captured under a policy that has since been archived. The archived policy still governs, because bookings keep the terms they were shown. This is why policies are archived and never deleted.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/booking/booking/cancel_booking.md`.
