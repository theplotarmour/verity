---
doc_id: ACT-BOOKING-CONFIRM_BOOKING
title: Action — Confirm a booking
generated: true
source_model: _model/capabilities/booking.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Confirm a booking

*This document is generated. Edit `_model/capabilities/booking.yaml`, not this file.*

**Entity:** `booking` · **Capability:** `booking`

## 1. Specification

### Who can perform it

- consumer
- customer_contact
- employee
- dispatcher
- integration_principal
- system

### Preconditions

- the hold is unexpired
- a contact channel or party is present
- any required deposit is paid or the payment window is open

### Inputs

- booking_id
- booked_by_party_ref
- subject_party_ref
- contact_channel_ref
- notes
- access_requirements
- deposit_reference

### What is created

- demand through the schedulable_demand port

### What is modified

- booking state
- cancellation_deadline_at frozen
- the hold converted to a reservation

### What events fire

- booking.confirmed

### Who is notified

- **to**: the booking party and, where different, the subject party; **channel**: their consenting channel; **when**: always; **template**: booking_confirmed; **must_include**: ['reference', 'window', 'location', 'cancellation_terms_disclosure_text', 'how_to_cancel']; **cost_class**: utility; **mandatory_operational**: True
- **to**: dispatcher; **channel**: in_app; **when**: no resource could be assigned; **template**: booking_unassigned; **priority**: high

### Can it be undone

Yes.

### Concurrency behaviour

Confirmation converts an existing hold rather than acquiring a new reservation, so the slot was already exclusive from the moment of the hold. This is the whole reason the hold exists as a state - a system that reserves at confirmation time has a race between choosing and confirming that no amount of transaction isolation removes, because the person is thinking in the middle of it.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | the hold has expired | That time is no longer held. Please choose again. | False | the nearest alternatives are offered, including the original slot if it happens to still be free |
| `E_VALIDATION` | 422 | neither a party nor a contact channel supplied | We need a way to reach you. | False |  |
| `E_PRECONDITION` | 409 | a deposit is required and the payment failed | This action is not available in the current state. | False | the booking moves to pending_confirmation and the hold is retained for the payment window rather than being released immediately, because releasing on the first payment failure loses the slot for somebody who is retrying their card |
| `E_DEPENDENCY` | 424 | the notification provider is unavailable | *(silent)* | True | the booking is CONFIRMED and the confirmation message is queued. Refusing to confirm because a message could not be sent would mean the person tries again and creates a second booking |
| `E_PRECONDITION` | 409 | the contact channel is suppressed or has refused consent for this purpose | This action is not available in the current state. | False | refused for a self-service booking, because a confirmed booking that cannot be confirmed to the person is a slot held for somebody who does not know they hold it. Permitted for a staff-entered booking, where the staff member is expected to tell them directly, and recorded as such |

## 3. Edge cases

**EC-01.** The booking party and the subject party being different, which is the normal case for a booking made on somebody else's behalf. Both are notified where both have consenting channels, the confirmation to the booker and the reminder to the subject. Sending everything to the booker is how the person who actually turns up never receives a reminder.

**EC-02.** Confirmation arriving after the slot has started, from a queued integration message. Accepted and immediately flagged, because refusing it would leave the record absent entirely and somebody may well be standing there.

**EC-03.** A booking confirmed with no resource assignable. Confirmed, and the dispatcher is told immediately at high priority. The alternative - refusing the confirmation - means turning away a person for a slot that is nominally available, and the tenant would rather know and fix it. This is the confirmed stuck policy's first monitored exception and it is the most damaging quiet failure here.

**EC-04.** access_requirements supplied by a person through a self-service surface. Stored gated by view_sensitive and always released to the assigned resource at the time of service. A field that the person delivering the service cannot read is a field that should not have been collected.

**EC-05.** Confirmation of a booking created from a waiting-list offer. The entry converts in the same transaction, so a person cannot both convert an offer and have the entry remain live to be offered another slot.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/booking/booking/confirm_booking.md`.
