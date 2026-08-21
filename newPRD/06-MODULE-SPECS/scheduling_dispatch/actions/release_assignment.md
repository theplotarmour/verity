---
doc_id: ACT-SCHEDULING_DISPATCH-RELEASE_ASSIGNMENT
title: Action — Take an assignment back
generated: true
source_model: _model/capabilities/scheduling_dispatch.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Take an assignment back

*This document is generated. Edit `_model/capabilities/scheduling_dispatch.yaml`, not this file.*

**Entity:** `assignment` · **Capability:** `scheduling_dispatch`

## 1. Specification

### Who can perform it

- dispatcher
- ops_manager

### Preconditions

- the assignment is not already terminal
- a reason is supplied when it has been published
- the acting session is elevated when the assignment is in progress

### Inputs

- assignment_id
- reason
- seek_backfill

### What is created

None.

### What is modified

- assignment state
- demand coverage
- resource availability

### What events fire

- assignment.released
- demand.coverage_changed

### Who is notified

- **to**: the resource; **channel**: push_and_in_app; **when**: the assignment was published; **template**: assignment_withdrawn; **must_include**: ['window', 'reason_category', 'actor_display_name']; **mandatory_operational**: True
- **to**: dispatcher; **channel**: in_app; **when**: released by anyone other than the dispatcher; **template**: coverage_lost

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

Coverage recomputation on the demand is done under the demand row lock, so a release racing an assignment cannot leave the coverage count wrong in either direction. A release racing an acceptance: the release wins and the resource is told their acceptance no longer applies, because the alternative is a person believing they hold a commitment that has been given away.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | the assignment is already terminal | *(silent)* | False | 2xx no-op |
| `E_VALIDATION` | 422 | reason empty on a published assignment | Give a reason. It is shown to the person. | False |  |
| `E_AUTHN` | 401 | session not elevated while the assignment is in progress | Confirm your identity to continue. | False |  |
| `E_DEPENDENCY` | 424 | backfill_request port unavailable while backfill was requested | *(silent)* | True | the release commits and the backfill request is queued. A release that fails because cover could not be sought leaves a commitment that everyone believes is staffed |

## 3. Edge cases

**EC-01.** Releasing the last covering assignment on a demand inside its risk window. The demand moves straight to at_risk and escalates immediately rather than waiting for the next scheduler pass, because the lead time is exactly what has just been lost.

**EC-02.** Releasing an assignment a resource has already travelled for. This capability cannot know that. Where evidence capture reports presence at the location, the release is refused and the correct action is to end the assignment early, which preserves the period for payment and billing. Releasing it would erase the fact that somebody turned up.

**EC-03.** A resource releasing their own assignment. Not this action - that is decline before start, and there is no self-release after start. A person who leaves mid-assignment is recorded by the supervisor as an early end, not as a release, because the two produce different pay and billing outcomes and only one of them is the person's own claim.

**EC-04.** Bulk release across a period, for instance when a location closes at short notice. Supported as a batch of individual releases sharing one correlation_id and one reason, so that each resource receives one message and the audit reads as one decision rather than forty.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/scheduling_dispatch/assignment/release_assignment.md`.
