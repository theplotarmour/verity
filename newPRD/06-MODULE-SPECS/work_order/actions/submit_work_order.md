---
doc_id: ACT-WORK_ORDER-SUBMIT_WORK_ORDER
title: Action — Raise a work order
generated: true
source_model: _model/capabilities/work_order.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Raise a work order

*This document is generated. Edit `_model/capabilities/work_order.yaml`, not this file.*

**Entity:** `work_order` · **Capability:** `work_order`

## 1. Specification

### Who can perform it

- dispatcher
- supervisor
- ops_manager
- employee
- integration_principal
- customer_contact

### Preconditions

- a work_type is chosen and is active
- either a subject or a location is present
- the tenant is not suspended

### Inputs

- work_type_id
- title
- description
- subject_ref
- location_ref
- requesting_party_ref
- priority
- requested_for_at
- origin
- origin_ref

### What is created

- work_order
- checklist answer rows from the template
- demand through the schedulable_demand port

### What is modified

None.

### What events fire

- work_order.submitted

### Who is notified

- **to**: dispatcher; **channel**: in_app; **when**: always; **template**: work_order_submitted; **batching_policy**: a digest per configured interval except at priority urgent or critical, which are immediate
- **to**: requesting_party; **channel**: as_configured; **when**: a customer surface is bound and the party has a consenting channel; **template**: request_received; **must_include**: ['reference', 'expected_response_window_if_a_clock_is_bound']; **cost_class**: utility

### Can it be undone

Yes.

### Concurrency behaviour

The reference number is allocated from a tenant-scoped sequence outside the transaction and is never reused, so a rolled-back submission leaves a gap in the numbering rather than a duplicate number. A gap is explainable; a duplicate reference is not, and the reference is what people say to each other on the phone.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | neither subject nor location supplied | Say where or what this is for. | False |  |
| `E_PRECONDITION` | 409 | the work_type is not active | This kind of work is not available. | False |  |
| `E_PRECONDITION` | 409 | the work_type requires evidence and the evidence_capture port is unbound | This action is not available in the current state. | False | refused at submission rather than at completion, so the failure lands on somebody at a desk rather than on somebody at a location |
| `E_AUTHZ_SCOPE` | 404 | location_ref is outside the submitter's scope | Not found. | False |  |
| `E_DEPENDENCY` | 424 | the sla_clock port is bound but unavailable | *(silent)* | True | the order COMMITS with due_source=none and the clock start is queued for retry. Refusing to accept work because a clock service is down is the wrong trade - the work still needs doing |
| `E_QUOTA` | 402 | open work order limit reached | Plan limit reached. | False |  |
| `E_RATE_LIMIT` | 429 | more than submit_burst per source per minute | Too many attempts. Try again shortly. | True | catches a misconfigured integration replaying a queue |

## 3. Edge cases

**EC-01.** Submitted offline by somebody standing at a location. Queued, and the reference number is provisional on the device and replaced by the authoritative one on sync, with the provisional number retained on the record - because the person will have written the provisional number on a paper docket and somebody will search for it.

**EC-02.** Two orders submitted for the same subject and the same fault by two different people. Both are created, and the duplicate outcome exists precisely so one can be closed honestly rather than deleted. Auto-merging is not offered, because two reports of the same symptom are sometimes two faults.

**EC-03.** Submitted by a customer_contact through the customer surface. Arrives in draft rather than ready when the tenant requires triage, and in ready when it does not. Which of the two is tenant configuration, because a business with a contractual response time cannot afford a triage step and a business without one cannot afford to dispatch on an unverified report.

**EC-04.** Submitted with requested_for_at in the past. Accepted. Retrospective recording of work already done is a real and frequent need, and the record carries the gap between requested_for_at and created_at so that it is visible rather than disguised.

**EC-05.** A recurrence run submitting an order for a subject that has since been retired. The work_subject port reports the subject unavailable and the order is created in draft with the reason attached, rather than being silently skipped. A silently skipped maintenance order is a maintenance plan that quietly stops running.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/work_order/work_order/submit_work_order.md`.
