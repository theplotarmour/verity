---
doc_id: ACT-BACKFILL_DISPATCH-ACCEPT_BACKFILL
title: Action — Accept cover
generated: true
source_model: _model/capabilities/backfill_dispatch.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Accept cover

*This document is generated. Edit `_model/capabilities/backfill_dispatch.yaml`, not this file.*

**Entity:** `backfill_offer` · **Capability:** `backfill_dispatch`

**Why this exists:** The moment somebody's day changes at short notice. It must work on one bar of signal, in one tap, and it must never accept two people for one place.

## 1. Specification

### Who can perform it

- employee
- dispatcher

### Preconditions

- the offer is pending and unexpired
- the request still needs cover
- the resulting assignment breaks no working-hour limit

### Inputs

- offer_id
- accepted_by_principal_id
- acceptance_channel

### What is created

- an assignment through the scheduling port

### What is modified

- offer response
- request coverage and state
- sibling offers withdrawn where the request is now full

### What events fire

- backfill.accepted
- backfill.filled

### Who is notified

- **to**: the accepting candidate; **channel**: push_and_in_app; **when**: always; **template**: cover_confirmed; **must_include**: ['window', 'location', 'premium_if_any', 'who_to_report_to']; **mandatory_operational**: True
- **to**: dispatcher; **channel**: in_app; **when**: always; **template**: cover_found; **must_include**: ['who', 'time_to_fill']
- **to**: candidates whose offers are withdrawn; **channel**: same_as_offer; **when**: always; **template**: cover_no_longer_needed; **mandatory_operational**: True; **note**: they may have rearranged their day on the strength of being asked
- **to**: the location supervisor; **channel**: in_app; **when**: always; **template**: cover_arranged; **must_include**: ['who', 'replacing_whom']

### Can it be undone

Yes.

### Concurrency behaviour

Acceptance takes the REQUEST row exclusively, not the offer row, and re-checks the coverage count inside the transaction. Two candidates accepting simultaneously for a single-count request: exactly one wins and the other is told immediately that the cover was taken, before they set off. The loser's message is deliberately worded as first-come rather than as a rejection, because they did nothing wrong and will be asked again next week. Acceptance also creates the assignment inside the same transaction, so a request can never be marked filled without an assignment existing.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | the offer has expired | This cover has already been taken or has expired. | False | deliberately merged with the taken case, because the candidate's next action is identical and distinguishing them only invites a complaint about timing |
| `E_CONFLICT_VERSION` | 409 | another candidate accepted first | This cover has already been taken or has expired. | True |  |
| `E_PRECONDITION` | 409 | a working-hour limit would be breached | This action is not available in the current state. | False | names the limit and the resulting total. This should have been caught at ranking, and reaching it here means the candidate's hours changed in between, which is legitimate and is why the check is repeated |
| `E_PRECONDITION` | 409 | the candidate has acquired an overlapping assignment since the offer was sent | This action is not available in the current state. | False | names the clash and its location |
| `E_DEPENDENCY` | 424 | the scheduling port is unavailable so the assignment cannot be created | A required service is unavailable. | True | acceptance is REFUSED rather than recorded without an assignment. A request marked filled with no assignment behind it is a commitment everybody believes is covered and nobody is assigned to |

## 3. Edge cases

**EC-01.** Accepted by a dispatcher on the candidate's behalf after a telephone call. Fully supported through the spoken_by_dispatcher channel, with the dispatcher recorded as the accepting principal and the candidate notified that cover was accepted on their behalf. The telephone is the fastest channel and leaving it unrecorded would mean the fastest path is invisible in every report.

**EC-02.** Accepted after the window has started, which happens when somebody is found late and travels immediately. Permitted, and the assignment is created with a start time of now rather than the window start, so that the partial coverage is honest and the person is paid for what they actually work.

**EC-03.** The accepting candidate then does not turn up. That is a no-show on the resulting assignment and raises a NEW backfill request with cause=no_show, chained to the original. The chain is retained, because a location whose backfills repeatedly fail twice is a different problem from one whose backfills fail once.

**EC-04.** Acceptance racing a cancellation of the underlying commitment. The cancellation wins and the candidate is told immediately, with the premium honoured where the tenant policy says a short-notice acceptance is compensated even when withdrawn. Whether it is compensated is configuration; that the candidate is told immediately is not.

**EC-05.** A candidate accepting who is under a delegation or acting on somebody else's behalf. Not permitted. Acceptance commits a person to be somewhere, and it is the one act in the platform that may not be delegated.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/backfill_dispatch/backfill_offer/accept_backfill.md`.
