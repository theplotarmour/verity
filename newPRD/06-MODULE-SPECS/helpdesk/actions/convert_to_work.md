---
doc_id: ACT-HELPDESK-CONVERT_TO_WORK
title: Action — Turn a ticket into work
generated: true
source_model: _model/capabilities/helpdesk.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Turn a ticket into work

*This document is generated. Edit `_model/capabilities/helpdesk.yaml`, not this file.*

**Entity:** `ticket` · **Capability:** `helpdesk`

**Why this exists:** The boundary that stops the helpdesk becoming a second work management system. The ticket keeps the conversation and the promise to the reporter; the work capability owns scheduling, evidence and completion, and neither closes the other.


## 1. Specification

### Who can perform it

- employee
- supervisor
- dispatcher

### Preconditions

- the work_generation port is bound
- a work type resolves from the category or is chosen
- a location or subject is present

### Inputs

- ticket_id
- work_type_ref
- subject_ref
- location_ref
- priority
- instructions

### What is created

- a work item through the work_generation port
- an internal note recording the conversion

### What is modified

- converted_work_refs

### What events fire

- ticket.converted_to_work

### Who is notified

- **to**: the reporter; **channel**: their consenting channel; **when**: the tenant tells reporters about scheduled work; **template**: work_arranged; **must_include**: ['reference', 'what_happens_next']; **cost_class**: utility
- **to**: dispatcher; **channel**: in_app; **when**: always; **template**: work_from_ticket

### Can it be undone

Yes.

### Concurrency behaviour

The ticket row is locked while the work reference is appended, so two concurrent conversions produce one work item and the second caller is shown the existing reference rather than an error.

### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | the work_generation port is unbound | This action is not available in the current state. | False | the category configuration should already have prevented reaching here, and the check is repeated because a port can be unbound after configuration |
| `E_VALIDATION` | 422 | no work type resolves and none was chosen | Choose what kind of work is needed. | False |  |
| `E_PRECONDITION` | 409 | the category requires a subject and none is present | Say what this is about. | False |  |
| `E_DEPENDENCY` | 424 | the work capability is unavailable | A required service is unavailable. | True | conversion is REFUSED rather than recorded optimistically. A ticket showing converted work that does not exist is a reporter who has been promised a visit nobody is arranging |
| `E_QUOTA` | 402 | more than max_conversions_per_ticket | Plan limit reached. | False | a ticket generating twenty work items is usually a mis-scoped report and is worth stopping to look at |

## 3. Edge cases

**EC-01.** Converting one ticket into several work items - a report covering three separate problems. Supported, and each work reference is tracked. The ticket resolves only when the reporter is satisfied, not when the work completes, which is why the two are deliberately not coupled.

**EC-02.** Work completing while the ticket is still awaiting the reporter. The ticket is not auto-resolved. Work being done and a reporter being satisfied are different facts, and a helpdesk that closes on the first produces a stream of reopens.

**EC-03.** Converting a ticket whose reporter is a counterparty with a contract that makes the work chargeable. The chargeability flows from the work capability and its billing sink, not from here. The helpdesk records that work was raised and never decides what it is worth.

**EC-04.** A ticket closed while its converted work is still open. Permitted and reported to the supervisor, because a reporter told their matter is closed while the visit is still outstanding will telephone and will be right to.

**EC-05.** Conversion of a duplicate ticket that was later merged. The work reference travels to the merge target, so the surviving ticket carries the whole picture and the merged one records that it did so.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/helpdesk/ticket/convert_to_work.md`.
