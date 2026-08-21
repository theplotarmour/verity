---
doc_id: ACT-WORK_ORDER-REOPEN_WORK_ORDER
title: Action — Reopen completed work
generated: true
source_model: _model/capabilities/work_order.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Reopen completed work

*This document is generated. Edit `_model/capabilities/work_order.yaml`, not this file.*

**Entity:** `work_order` · **Capability:** `work_order`

**Why this exists:** Work that was signed off and then failed is normal. Modelling it as a linked successor rather than as a new unrelated order is what makes the reopen rate measurable, and the reopen rate is the only quality signal this capability produces that anybody acts on.


## 1. Specification

### Who can perform it

- supervisor
- ops_manager
- customer_contact

### Preconditions

- the order is completed
- now is within the work_type's reopen_window_days
- a reason is supplied

### Inputs

- work_order_id
- reason
- priority
- evidence_refs

### What is created

- a new work_order with origin=reopen and reopen_of_work_order_id set
- and its demand

### What is modified

- the original's reopen_count

### What events fire

- work_order.reopened
- work_order.submitted

### Who is notified

- **to**: the original assignee and their supervisor; **channel**: in_app; **when**: always; **template**: work_reopened; **must_include**: ['original_reference', 'reason', 'who_reopened']
- **to**: ops_manager; **channel**: in_app; **when**: the chain length exceeds reopen_chain_alert; **template**: repeated_reopen

### Can it be undone

Yes.

### Concurrency behaviour

The original row is locked while reopen_count is incremented and the successor is created, so two concurrent reopens produce one successor rather than two orders for one failure.

### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | outside the reopen window | This was completed too long ago to reopen. Raise new work instead. | False | offers the alternative rather than only refusing |
| `E_VALIDATION` | 422 | reason empty | Say what went wrong. It is shown to the person who did the work. | False |  |
| `E_PRECONDITION` | 409 | the original is already reopened | *(silent)* | False | returns the existing successor. Reopening a reopened order means working on the successor, not creating a sibling |
| `E_AUTHZ_SCOPE` | 404 | a customer_contact reopening an order that is not theirs | Not found. | False |  |

## 3. Edge cases

**EC-01.** Reopened by the requesting party through the customer surface. Fully supported and is the case that matters most, because a counterparty who cannot reopen will telephone, and the telephone call is not in any report. The reopen carries their reason verbatim.

**EC-02.** The successor is billable or not. Deliberately undetermined by default rather than defaulting to not_billable. Whether a return visit is chargeable is a contractual question this capability cannot answer, and defaulting it either way is a revenue decision made by a schema.

**EC-03.** The original assignee has since ended their engagement. The successor is unassigned and the notification about the reopen is not sent to them. The original remains attributed to them, because it was theirs.

**EC-04.** Reopening a work order whose subject has been retired. Permitted, with the subject shown as retired. Work is frequently reopened precisely because the subject was replaced.

**EC-05.** A reopen chain crossing a work_type version change. The successor uses the CURRENT work type and its current checklist, and records that it differs from the original's. Reusing a superseded template for a new piece of work would mean asking questions the tenant has decided to stop asking.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/work_order/work_order/reopen_work_order.md`.
