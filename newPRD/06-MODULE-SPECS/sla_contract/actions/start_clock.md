---
doc_id: ACT-SLA_CONTRACT-START_CLOCK
title: Action — Start a service-level clock
generated: true
source_model: _model/capabilities/sla_contract.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Start a service-level clock

*This document is generated. Edit `_model/capabilities/sla_contract.yaml`, not this file.*

**Entity:** `sla_measurement` · **Capability:** `sla_contract`

**Why this exists:** Modelled explicitly because the deadline computed here is told to people and to counterparties, and because the calendar fallback chain has three steps whose outcome must be recorded rather than recomputed later.


## 1. Specification

### Who can perform it

- system
- integration_principal

### Preconditions

- an active contract covers the subject
- an active service level matches it
- no running measurement already exists for this subject and level

### Inputs

- service_level_id
- subject_ref
- subject_capability_key
- location_ref
- started_at

### What is created

- sla_measurement

### What is modified

None.

### What events fire

- sla.clock_started

### Who is notified

- **to**: the subject's owner; **channel**: in_app; **when**: the level's target is inside notify_short_target_minutes; **template**: tight_deadline; **must_include**: ['target_at', 'level_label']

### Can it be undone

Yes.

### Concurrency behaviour

A partial unique index over (service_level_id, subject_ref) among running and paused measurements. A duplicate start returns the existing measurement rather than erroring, because the caller is an event consumer whose correct behaviour on a duplicate is to carry on.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | no active contract covers the subject | *(silent)* | False | no measurement is created and the fact is recorded against the subject as unmeasured, so that a record outside all contracts is visible rather than silently unmeasured |
| `E_PRECONDITION` | 409 | target_unit is business_hours and no calendar resolves | *(silent)* | False | REFUSED rather than falling back to wall hours. The fallback would make the target roughly three times easier and the resulting report would show excellent performance against a target nobody is meeting |
| `E_CONFLICT_UNIQUE` | 409 | a running measurement already exists | *(silent)* | False | returns the existing measurement |
| `E_VALIDATION` | 422 | started_at more than clock_backdate_limit_minutes in the past | *(silent)* | False | accepted with the backdating recorded, because offline replay legitimately produces late start events and refusing them would leave the record unmeasured entirely |
| `E_DEPENDENCY` | 424 | the calendar service is unavailable | *(silent)* | True | the measurement is created with target_at null and a recompute is queued. A clock with no deadline still records elapsed time, and the deadline can be established later; refusing the clock entirely would lose the start time |

## 3. Edge cases

**EC-01.** Two service levels on one contract both matching one subject - a first-response target and a resolution target. Both measurements are created and run concurrently. This is the normal case and the reason the unique index is per level rather than per subject.

**EC-02.** A start event arriving for a subject whose contract activated after the subject was created. The measurement starts from the event time, not from the contract activation, and contract activation lists pre-existing open records rather than retroactively binding them. Retroactively starting clocks on work already in progress creates breaches nobody could have prevented.

**EC-03.** Offline replay delivering a start event days late. The clock starts at the claimed occurred_at and the target is computed from there, so a deadline may already have passed at the moment the clock is created. It records as breached immediately, which is correct - the obligation existed regardless of when the system heard about it.

**EC-04.** A subject that moves location mid-measurement, changing which calendar applies. The calendar resolved at start is frozen, and the move is recorded on the measurement. Re-resolving would move a deadline somebody has already been told.

**EC-05.** The contract is suspended while the clock runs. The clock continues. Suspending a commercial relationship does not discharge an obligation on work already accepted, and this is stated in the transition side effects rather than left to inference.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/sla_contract/sla_measurement/start_clock.md`.
