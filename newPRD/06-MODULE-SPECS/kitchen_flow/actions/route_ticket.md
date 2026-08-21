---
doc_id: ACT-KITCHEN_FLOW-ROUTE_TICKET
title: Action — Route work to stations
generated: true
source_model: _model/capabilities/kitchen_flow.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Route work to stations

*This document is generated. Edit `_model/capabilities/kitchen_flow.yaml`, not this file.*

**Entity:** `preparation_ticket` · **Capability:** `kitchen_flow`

**Why this exists:** The moment a request becomes work somebody can see. Its failure mode - a line matching no open station - is the single most damaging quiet failure in a preparation operation and it is modelled as a state rather than as an error.


## 1. Specification

### Who can perform it

- system
- supervisor

### Preconditions

- the ticket has at least one line
- the location has at least one station configured

### Inputs

- ticket_id
- manual_station_assignments

### What is created

- preparation_step rows

### What is modified

- ticket state

### What events fire

- preparation.routed
- preparation.unrouted

### Who is notified

- **to**: the location supervisor; **channel**: floor_surface_and_push; **when**: any line matched no open station; **template**: unrouted_work; **must_include**: ['display_reference', 'unmatched_lines', 'tags_that_matched_nothing']; **priority**: high; **mandatory_operational**: True

### Can it be undone

Yes.

### Concurrency behaviour

Routing takes the ticket row exclusively and reads the station set from a snapshot. A station opening or closing during routing does not change the outcome for that ticket; it affects the next one. Deterministic routing is what makes replay safe and it is worth more than routing to the most current station set.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | a line matches no open station | *(silent)* | False | the ticket enters UNROUTED rather than failing. An error here would be swallowed by an integration; a state is visible on a screen a human is already looking at |
| `E_PRECONDITION` | 409 | the location has no stations configured at all | *(silent)* | False | the ticket enters unrouted and the supervisor is told that nothing is configured, which is a different message from nothing matching |
| `E_VALIDATION` | 422 | a manual assignment names a station whose tags do not match the line | This station does not handle that. | False | overridable with a reason, because a supervisor at the counter knows something the tags do not |
| `E_QUOTA` | 402 | the ticket would create more than max_steps_per_ticket | *(silent)* | False | routed up to the limit and flagged. Refusing entirely would leave the whole request unprepared over a configuration mistake |

## 3. Edge cases

**EC-01.** A line matching two stations. Routed to the one with the lowest sequence_position, unless the line declares multi-station preparation, in which case it produces a step at each and the ticket is not ready until both complete. Duplicating every ambiguous line would turn one request into two pieces of work.

**EC-02.** Routing while offline. Performed locally against the cached station set, and re-evaluated on sync. Where the server's routing differs, the local routing stands for steps already started and the difference is recorded, because moving work that somebody has begun is worse than a routing inconsistency.

**EC-03.** A ticket arriving for a location whose stations are all closed, at the end of a service period. Enters unrouted and alerts loudly. Automatically closing the request would be a decision this capability may not take - it is the source's request and only the source can withdraw it.

**EC-04.** Re-routing after a station opens. The unrouted ticket is routed automatically without a human, because the condition that caused it has been fixed and re-alerting somebody who has just fixed it is noise.

**EC-05.** A ticket whose source cancels it during routing. The cancellation wins; steps created in the same transaction are cancelled with it, so no station ever sees a step for a cancelled request.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/kitchen_flow/preparation_ticket/route_ticket.md`.
