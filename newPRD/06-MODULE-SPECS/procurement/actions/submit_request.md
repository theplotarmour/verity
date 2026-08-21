---
doc_id: ACT-PROCUREMENT-SUBMIT_REQUEST
title: Action — Ask for something
generated: true
source_model: _model/capabilities/procurement.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Ask for something

*This document is generated. Edit `_model/capabilities/procurement.yaml`, not this file.*

**Entity:** `purchase_request` · **Capability:** `procurement`

**Why this exists:** Deliberately open to almost everybody. A request path restricted to managers is a path that gets bypassed, and the bypass is somebody buying something with their own money and claiming it back, which is invisible to every control in this capability.


## 1. Specification

### Who can perform it

- employee
- supervisor
- dispatcher
- ops_manager
- system

### Preconditions

- at least one line
- the tenant is not suspended

### Inputs

- lines
- location_ref
- needed_by
- justification
- source_ref

### What is created

- purchase_request

### What is modified

None.

### What events fire

- purchase_request.submitted

### Who is notified

- **to**: the resolved approver; **channel**: in_app_and_push; **when**: always; **template**: approval_requested; **must_include**: ['requester', 'estimated_total_if_visible', 'needed_by', 'line_summary']; **batching_policy**: digest per approver per configured interval, except where needed_by is inside the approval window, which is immediate
- **to**: the requester; **channel**: in_app; **when**: always; **template**: request_submitted; **must_include**: ['who_it_went_to']

### Can it be undone

Yes.

### Concurrency behaviour

Requests do not contend. Two people requesting the same thing both succeed and the duplicate is surfaced to the approver rather than prevented, because two people needing the same thing is frequently two genuine needs and sometimes one, and only a person knows which.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | no lines | Add at least one item. | False |  |
| `E_VALIDATION` | 422 | a line has both an item and a free-text description | field-specific | False |  |
| `E_PRECONDITION` | 409 | no approver can be resolved for this scope and value | This action is not available in the current state. | False | names the missing approval configuration. The request is still CREATED in draft rather than lost, because the requester still needs the thing and the fix is an administrator's job |
| `E_AUTHZ_FIELD` | 200 | estimated costs supplied without view_financial | *(silent)* | False | dropped. The request proceeds with quantities and descriptions, which is the common case for a person on a location who knows what is needed and not what it costs |
| `E_QUOTA` | 402 | open request limit reached | Plan limit reached. | False |  |

## 3. Edge cases

**EC-01.** A request raised automatically by a low balance. Idempotent on the source reference, so a nightly rule produces one open request rather than thirty. When the balance recovers before approval the request is not auto-cancelled; the approver is shown the current balance alongside, and decides.

**EC-02.** A request for something not in the catalogue. Fully supported as free text, and this is the majority case in several target segments. The commitment raised from it carries the free text through to the supplier, and no stock movement results unless somebody catalogues it later.

**EC-03.** A request submitted offline from a location with no signal. Queued. The approver is notified on sync, and the notification carries both the claimed submission time and the arrival time, because needed_by dates are frequently already past by the time the request lands.

**EC-04.** Self-approval. Permitted only below a configured value and only where the tenant has explicitly enabled it, because for a two-person business requiring a second approver makes the capability unusable. Where permitted it is always recorded as self-approved and reported.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/procurement/purchase_request/submit_request.md`.
