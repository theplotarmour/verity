---
doc_id: ACT-KITCHEN_FLOW-COMPLETE_STEP
title: Action — Mark a step done
generated: true
source_model: _model/capabilities/kitchen_flow.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Mark a step done

*This document is generated. Edit `_model/capabilities/kitchen_flow.yaml`, not this file.*

**Entity:** `preparation_step` · **Capability:** `kitchen_flow`

**Why this exists:** The most frequent action on a station display, performed with one hand, wet, at speed. It must be a single unambiguous target and it must work with no connectivity, and its idempotency must be absolute because a double tap is the normal input.


## 1. Specification

### Who can perform it

- employee

### Preconditions

- the step is in progress or held
- the station is open or the tenant permits completing at a paused station

### Inputs

- step_id
- device_ref
- completed_at
- evidence_ref

### What is created

- stock consumption where the sink is bound

### What is modified

- step state and elapsed
- ticket readiness
- the next chained station offered its step

### What events fire

- preparation.step_completed
- preparation.ticket_ready

### Who is notified

- **to**: whoever collects; **channel**: display_and_push; **when**: the ticket becomes ready; **template**: ready_for_collection; **must_include**: ['display_reference']; **mandatory_operational**: True
- **to**: the next station in a chain; **channel**: display; **when**: a chained successor exists; **template**: work_incoming

### Can it be undone

Yes.

### Concurrency behaviour

Completion is a conditional write on the step's current state. Two people completing the same step from two displays converge to one completion, and the second display simply shows it as done rather than showing an error - an error on a station screen at the busiest moment is read as a fault and the device is abandoned. Ticket readiness is recomputed under the ticket row lock from the full step set, so a race cannot mark a ticket ready while a step remains.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | the step is already complete | *(silent)* | False | 2xx no-op, and the display simply shows it as done |
| `E_PRECONDITION` | 409 | the step was never started | *(silent)* | False | completed anyway, with started_at set equal to completed_at and the step marked as never-timed. Refusing would mean somebody who did the work cannot record it, and an untimed record is better than no record |
| `E_DEPENDENCY` | 424 | the stock sink is bound but unavailable | *(silent)* | True | the completion COMMITS and the consumption is queued. Blocking a station display on a stock service is how an entire operation stops because of a background system |
| `E_OFFLINE_STALE` | 409 | the ticket was cancelled while the device was offline | *(silent)* | True | the completion is retained and recorded as work done on a cancelled ticket, with its elapsed time, so the cost is visible. It is never silently discarded - somebody did the work |
| `E_VALIDATION` | 422 | completed_at is in the future by more than clock_skew_tolerance_seconds | *(silent)* | False | clamped to server receipt time with the skew recorded, because a station device with a wrong clock would otherwise produce negative elapsed times |

## 3. Edge cases

**EC-01.** Completed offline and synced hours later. elapsed_seconds is computed from the device's own start and completion times, which is correct - the work took what it took - while received_at and the sync lag come from the server. Computing elapsed from server timestamps would make every offline step appear to take hours.

**EC-02.** The last step of a ticket completing while another device is holding a different step open. Readiness is recomputed from the step set under the lock, so the ticket does not become ready. The display on the completing device shows the outstanding step, because the person's next question is what is still missing.

**EC-03.** Completion of a step whose ticket has been recalled. Recorded against the original ticket, which is now terminal, and flagged. The work happened and hiding it would understate what a recall costs.

**EC-04.** A station completing steps far faster than plausible. Not blocked - blocking a station display is unacceptable - and reported as a pattern by the complete stuck policy. The remedy is a conversation, and the model's job is to make the conversation possible.

**EC-05.** Completion with evidence attached, for a step where quality is disputed later. The evidence and the completion queue together as one unit offline, for the same reason work orders queue their evidence with their completion.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/kitchen_flow/preparation_step/complete_step.md`.
