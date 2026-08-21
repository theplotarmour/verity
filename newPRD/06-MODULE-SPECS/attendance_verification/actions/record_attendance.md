---
doc_id: ACT-ATTENDANCE_VERIFICATION-RECORD_ATTENDANCE
title: Action — Record a start or an end
generated: true
source_model: _model/capabilities/attendance_verification.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Record a start or an end

*This document is generated. Edit `_model/capabilities/attendance_verification.yaml`, not this file.*

**Entity:** `attendance_record` · **Capability:** `attendance_verification`

**Why this exists:** The most frequently executed human action in the platform, performed twice a day per person, at a gate, in the dark, in the rain, on a cheap phone with poor signal, often by somebody who is not the person it concerns. If it is slow or fragile, the tenant reverts to a paper register and every downstream capability starves.


## 1. Specification

### Who can perform it

- employee
- supervisor
- dispatcher
- integration_principal

### Preconditions

- The person is an active resource.
- Where a commitment is named, it exists and has not been cancelled.
- No conflicting open record exists for the same person at another location.

### Inputs

- resource_ref
- commitment_ref
- location_ref
- boundary
- asserted_at
- position
- position_accuracy_m
- evidence_ref
- substitution_of_resource_ref
- note

### What is created

- attendance_record on first assertion
- presence_evaluation
- evidence attachment

### What is modified

- attendance_record claimed and verified fields
- evidence strength
- position verdict and margin

### What events fire

- attendance.claimed
- attendance.evidence_recorded

### Who is notified

- **to**: supervisor; **channel**: in_app; **when**: the position verdict is outside beyond outside_margin_alert_m, or the strength is below the tenant requirement; **template**: attendance_needs_review; **batching_policy**: one digest per configured interval
- **to**: the person; **channel**: push; **when**: a record was created about them by somebody else; **template**: attendance_recorded_for_you; **must_include**: ['recorded_by', 'period', 'location']; **mandatory_operational**: True

### Can it be undone

Yes.

### Concurrency behaviour

A partial unique index prevents two open records for one person at one time, so the person cannot be present at two locations at once. Where a second start arrives for a person with an open record elsewhere, it is accepted and BOTH are flagged rather than one being refused, because refusing the second means the person standing at the second location cannot record anything at all and will use paper. Which of the two is correct is a dispute, and the model's job is to capture both claims rather than to arbitrate at the gate.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | position supplied without position_accuracy_m | *(silent)* | False | the position is DISCARDED and the record proceeds with strength=device_only. A position with no stated accuracy cannot be evaluated honestly, and guessing the accuracy silently bypasses the accuracy floor |
| `E_PRECONDITION` | 409 | the person is not an active resource | This action is not available in the current state. | False | recorded anyway as an orphan claim requiring supervisor triage where the tenant enables it, because a person who turns up on their first day before their record is activated has still turned up |
| `E_CONFLICT_UNIQUE` | 409 | an open record already exists at another location | You are already signed in somewhere else. | False | both records are retained and flagged, per the concurrency note |
| `E_VALIDATION` | 422 | asserted_at more than max_backdate_hours in the past | That is too far back to record here. | False | the correct path is a supervisor-attested record, which carries a different evidence strength and is separately reported. Allowing arbitrary backdating on the self-service path is how a register becomes fiction |
| `E_DEPENDENCY` | 424 | the presence_evidence port is bound but unavailable | *(silent)* | True | the record COMMITS with verdict not_evaluated and strength device_only. Refusing to record attendance because a geofence service is down would leave a person unable to prove they were there |
| `E_RATE_LIMIT` | 429 | more than attendance_burst_per_device per minute | Too many attempts. Try again shortly. | True | a shared terminal at shift change legitimately produces a high rate, so the limit is per device and generous, and is intended to catch a replaying integration rather than a queue of people |

## 3. Edge cases

**EC-01.** Recorded offline with no signal, which is the normal case at many locations. The record and its evidence are queued as one unit. occurred_at is the device's claimed time, recorded_at is the server's, and sync_lag_minutes is retained. Records arriving in a burst days later are flagged for review, never rejected, because a broken handset and a fabrication produce the same shape and only a human can distinguish them.

**EC-02.** A device whose clock is wrong. asserted_at is recorded as claimed and a clock_skew marker is computed against the server's receipt time. It is never silently corrected, because the skew is the only evidence that the claim is unreliable.

**EC-03.** Somebody covering for another person, arriving with the absent person's commitment. Recorded against the substitute with substitution_of_resource_ref set. The absent person's own record is NOT auto-created and NOT auto-voided, because whether they were absent is a separate fact that somebody must record deliberately.

**EC-04.** Recorded by a supervisor on behalf of a person with no device. Fully supported, strength=supervisor_attested, and the person is notified that a record was made about them. The notification is mandatory_operational and not suppressible, because the alternative is a system where somebody's hours are recorded by another person without their knowledge.

**EC-05.** A geofence verdict of inconclusive because the person is inside a building. Recorded as inconclusive, never as outside, and the record's strength is geofence_inconclusive - which is above self_declared and below geofence_confirmed. The tenant's required strength decides whether that is sufficient, and it is a configured decision rather than an accident of GPS.

**EC-06.** A start recorded with no matching end because the person's phone died. This is the claimed stuck state and its policy governs. What matters here is that the start is not voided and not capped automatically - both would destroy or fabricate evidence about a period somebody worked.

**EC-07.** Attendance with no commitment at all - somebody called in at short notice before the roster caught up. Fully supported with commitment_ref null. Lateness and no-show become uncomputable for that record and it is still payable and billable, which is the correct trade.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/attendance_verification/attendance_record/record_attendance.md`.
