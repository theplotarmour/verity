---
doc_id: ACT-WORK_ORDER-COMPLETE_WORK
title: Action — Complete the work
generated: true
source_model: _model/capabilities/work_order.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Complete the work

*This document is generated. Edit `_model/capabilities/work_order.yaml`, not this file.*

**Entity:** `work_order` · **Capability:** `work_order`

**Why this exists:** The moment the record becomes evidence. Everything downstream - billing, SLA measurement, quality, payroll - reads what is recorded here, and it is recorded by somebody standing in the rain on a cheap phone with one bar of signal.


## 1. Specification

### Who can perform it

- employee
- supervisor

### Preconditions

- The order is in_progress.
- Every blocking checklist item is answered.
- The work_type evidence requirement is met, or an override with a reason is recorded.
- An outcome is chosen.

### Inputs

- work_order_id
- outcome
- outcome_notes
- checklist_answers
- evidence_refs
- labour_minutes
- travel_minutes
- parts_used
- override_reason

### What is created

- checklist answer versions
- evidence attachments
- stock movements where the sink is bound
- a billable outcome where the sink is bound

### What is modified

- work_order state
- completed_at
- outcome
- labour and travel
- billable classification

### What events fire

- work_order.completed
- work_order.outcome_recorded

### Who is notified

- **to**: the nominated signer; **channel**: push_and_in_app; **when**: the work_type requires sign-off; **template**: signoff_requested; **must_include**: ['reference', 'outcome', 'evidence_summary']; **mandatory_operational**: True
- **to**: requesting_party; **channel**: as_configured; **when**: a customer surface is bound and no sign-off is required; **template**: work_completed; **cost_class**: utility
- **to**: supervisor; **channel**: in_app; **when**: an evidence override was used, or the outcome is not_possible or no_fault_found; **template**: completion_needs_review

### Can it be undone

Yes.

### Concurrency behaviour

Completion takes the work order row exclusively. Two people completing the same order - an assignee and a supervisor closing it from the console at the same moment - resolve to one completion, and the loser is shown the winner's outcome rather than a generic conflict, because their next action depends on what was recorded rather than on the fact that they lost. Stock movements and the billable event are emitted inside the same transaction as the state change, so a completion can never exist without them or they without it.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | a blocking checklist item is unanswered | Answer the required checks first. | False | names the items, and the field surface scrolls to the first one rather than only reporting |
| `E_PRECONDITION` | 409 | the evidence requirement is unmet and no override reason was given | This action is not available in the current state. | False | names what is missing - for example two photos required, one attached |
| `E_VALIDATION` | 422 | outcome is not_recorded | Choose what the outcome was. | False |  |
| `E_AUTHZ_FIELD` | 200 | cost fields supplied without view_financial | *(silent)* | False | dropped and reported. Labour and travel minutes are NOT financial fields and are always recordable, because the person doing the work must be able to record their own time |
| `E_OFFLINE_STALE` | 409 | the order was cancelled or completed by somebody else while the device was offline | This was changed while you were offline. | True | the queued completion is NOT discarded. It is held in the conflict queue with its evidence intact, because the work was done and the evidence is the only record of it |
| `E_DEPENDENCY` | 424 | the stock_movement_sink is bound but unavailable | A required service is unavailable. | True | the completion is REFUSED rather than committing without the stock movement, because a completion that consumed parts without recording them silently corrupts stock and the error compounds daily. This is the opposite trade from the sla_clock case above, and the difference is that a clock can be applied retroactively and a stock movement cannot |
| `E_CONFLICT_VERSION` | 409 | the checklist template version changed | *(silent)* | True | impossible by construction - the order captured its template version at submission. Listed here because the naive implementation resolves the template at completion time and would produce exactly this error |

## 3. Edge cases

**EC-01.** Completed offline with photos on a device with no signal. The completion and its evidence are queued together as one unit and are replayed atomically. Evidence that syncs without its completion, or a completion that syncs without its evidence, is the failure mode that makes field evidence untrustworthy, and the queue treats them as one item for that reason.

**EC-02.** Completed with outcome=not_possible. Fully first-class. No billable event is emitted by default, the requesting party is told, and a follow-up order is offered but never created automatically. A system that only offers a successful outcome gets a successful outcome recorded for every visit, including the ones where nothing was done.

**EC-03.** Completed with an evidence override. Permitted where the tenant allows it, always with a reason, always reported, and the resulting billable event carries a marker that the evidence requirement was overridden - so that a counterparty disputing the line can be shown the truth rather than a claim.

**EC-04.** A completion arriving days late from a device that was offline. occurred_at is the device's claimed completion time and recorded_at is the server's, and both are retained. Where the gap exceeds late_sync_alert_hours the completion is flagged for review rather than blocked, because both a broken phone and a fabricated record produce the same shape and only a human can tell them apart.

**EC-05.** Labour minutes exceeding the assignment window by a large margin. Accepted and flagged. Refusing would make an honest overrun unrecordable; accepting silently would let it flow into billing and payroll unnoticed.

**EC-06.** Parts recorded while the stock sink is unbound. Stored as free text on the order and carried into the billable event as evidence. When a stock capability is later bound, historical free-text parts are NOT retroactively converted into stock movements, because inventing a stock history from free text would corrupt the opening balance of the new system.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/work_order/work_order/complete_work.md`.
