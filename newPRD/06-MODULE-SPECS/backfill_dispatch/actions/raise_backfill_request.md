---
doc_id: ACT-BACKFILL_DISPATCH-RAISE_BACKFILL_REQUEST
title: Action — Seek cover
generated: true
source_model: _model/capabilities/backfill_dispatch.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Seek cover

*This document is generated. Edit `_model/capabilities/backfill_dispatch.yaml`, not this file.*

**Entity:** `backfill_request` · **Capability:** `backfill_dispatch`

**Why this exists:** Almost always triggered automatically by an absence, a decline or a no-show elsewhere. Modelled as an explicit action because the manual path matters just as much - a supervisor who learns by telephone that somebody is not coming needs the same machinery as the automatic detector.


## 1. Specification

### Who can perform it

- system
- dispatcher
- supervisor

### Preconditions

- the commitment exists and is not cancelled
- its window has not ended
- an escalation policy covers its priority

### Inputs

- commitment_ref
- absent_resource_ref
- cause
- priority_override
- required_count

### What is created

- backfill_request

### What is modified

None.

### What events fire

- backfill.requested

### Who is notified

- **to**: dispatcher; **channel**: push_and_in_app; **when**: always; **template**: cover_needed; **must_include**: ['location', 'window', 'lead_time', 'cause']; **priority**: high; **mandatory_operational**: True

### Can it be undone

Yes.

### Concurrency behaviour

A unique index over (commitment_ref, window_start) among non-terminal requests. A second raise returns the existing request rather than erroring, because the second caller is usually a different detector noticing the same gap and their next action should be to watch the existing search, not to start another.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | the commitment window has already ended | This action is not available in the current state. | False | the correct record is an unfilled outcome on the commitment itself, not a backfill nobody can fulfil |
| `E_PRECONDITION` | 409 | no escalation policy covers this priority | This action is not available in the current state. | False | names the missing policy. A backfill with no ladder is undefined after the first offer, so this is refused rather than defaulted |
| `E_CONFLICT_UNIQUE` | 409 | a live request already exists for this commitment | *(silent)* | False | returns the existing request with 200 |
| `E_DEPENDENCY` | 424 | the resource provider is unavailable | A required service is unavailable. | True | the request is still CREATED in state raised, and the ranking retries. The gap exists whether or not the candidate service is reachable, and recording it is what makes the dispatcher aware |
| `E_AUTHZ_SCOPE` | 404 | the commitment is outside the raiser's scope | Not found. | False |  |

## 3. Edge cases

**EC-01.** Raised for a commitment that was never covered in the first place. Legitimate and common - a roster published with a known gap. absent_resource_ref is null and cause is demand_increase or unknown, and the billing classification default differs from a decline-driven backfill, which is exactly why cause is a field rather than an inference.

**EC-02.** Two causes for one gap - somebody declined and then also reported an absence. One request, and the cause is the first one recorded, with the second appended to the narrative. Changing the cause afterwards would change the billing classification retroactively.

**EC-03.** Raised with less lead time than the fastest tier can complete. Accepted, the ladder compresses per the policy, and the request records that it started already compressed - so that an unfilled outcome can be read against what was actually possible rather than against the policy on paper.

**EC-04.** Raised automatically while the dispatcher is already handling the same gap manually. The idempotency key collapses them, and the dispatcher's manual offers are recorded against the same request through the spoken_by_dispatcher channel. Parallel manual and automatic searches are the most reliable way to double-staff a commitment.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/backfill_dispatch/backfill_request/raise_backfill_request.md`.
