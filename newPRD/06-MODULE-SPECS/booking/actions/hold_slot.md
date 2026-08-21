---
doc_id: ACT-BOOKING-HOLD_SLOT
title: Action — Hold a slot while somebody decides
generated: true
source_model: _model/capabilities/booking.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Hold a slot while somebody decides

*This document is generated. Edit `_model/capabilities/booking.yaml`, not this file.*

**Entity:** `booking` · **Capability:** `booking`

**Why this exists:** The interval between choosing a slot and confirming it is where double-booking happens. Modelling the hold explicitly, with an expiry and a release, is the difference between a booking system that works under concurrency and one that works in a demonstration.


## 1. Specification

### Who can perform it

- consumer
- customer_contact
- employee
- dispatcher
- integration_principal

### Preconditions

- the requested window is available through the resource port
- the location is operating where a calendar is bound
- the party size does not exceed the offering capacity

### Inputs

- offering_ref
- location_ref
- requested_resource_ref
- starts_at
- ends_at
- party_size
- channel

### What is created

- booking in state held
- a hold against the resource through the scheduling port

### What is modified

None.

### What events fire

- booking.held

### Who is notified

None.

### Can it be undone

Yes.

### Concurrency behaviour

The hold is taken as a real reservation against the resource inside the transaction, using the same exclusion constraint the scheduler uses for assignments, so two people cannot hold overlapping slots on one resource. Holds carry an expiry and are swept; the sweep is what makes the constraint safe to rely on, and a failed sweep silently removes inventory, which is why it has its own platform alert.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_CONFLICT_UNIQUE` | 409 | the slot was taken between the availability query and the hold | That time has just been taken. | False | the response includes the nearest alternatives, because the person's next action is always to pick another time and making them start again is how a self-service booking is abandoned |
| `E_PRECONDITION` | 409 | the location is closed at that time | This action is not available in the current state. | False | names the operating hours |
| `E_VALIDATION` | 422 | party_size exceeds the offering capacity | field-specific | False |  |
| `E_QUOTA` | 402 | the party already holds max_concurrent_holds | Plan limit reached. | False | prevents one client tying up an entire day's inventory by opening many tabs, which is both an honest mistake and an attack |
| `E_RATE_LIMIT` | 429 | hold_burst per source exceeded | Too many attempts. Try again shortly. | True |  |
| `E_DEPENDENCY` | 424 | the resource provider is unavailable | A required service is unavailable. | True | the hold is REFUSED. Holding a slot without being able to verify availability produces confirmed bookings with no resource behind them |

## 3. Edge cases

**EC-01.** A hold placed and then abandoned, which is the majority outcome for self-service. It expires and the slot returns. No notification is sent, because the person is in the middle of something else and a message about an abandoned form is noise.

**EC-02.** Two people holding adjacent slots that together exceed a resource's capacity for the period. Capacity is the resource provider's concern and is enforced there. This capability holds against the resource and trusts the exclusion constraint, rather than reimplementing capacity logic that would then disagree with the scheduler.

**EC-03.** A hold surviving its expiry because the sweep is not running. Detected by the held stuck-state policy as a platform alert. This is deliberately a platform alert and not a tenant one - inventory silently disappearing is invisible from inside the tenant, who simply sees fewer available slots.

**EC-04.** A staff member holding a slot on the telephone while the person decides. Identical mechanism, longer expiry configured per channel, because a telephone conversation legitimately takes longer than a web form and a ten-minute hold that expires mid-call is worse than no hold.

**EC-05.** Holding a slot for a waiting-list offer. The hold is created by the waiting-list machinery rather than by a person, with the offer expiry as the hold expiry, so a waiting-list offer cannot be made against a slot somebody else can take in the meantime.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/booking/booking/hold_slot.md`.
