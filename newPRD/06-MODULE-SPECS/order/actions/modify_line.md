---
doc_id: ACT-ORDER-MODIFY_LINE
title: Action — Change a line after it has been sent
generated: true
source_model: _model/capabilities/order.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Change a line after it has been sent

*This document is generated. Edit `_model/capabilities/order.yaml`, not this file.*

**Entity:** `order_line` · **Capability:** `order`

**Why this exists:** Modelled separately from capture because after routing a change is a negotiation with whoever is already working on it, not an edit. Treating it as an edit is how a fulfilment surface receives a quantity it has already produced.


## 1. Specification

### Who can perform it

- employee
- supervisor

### Preconditions

- the line is routed or in_fulfilment
- the acting principal may modify
- a reason is supplied

### Inputs

- line_id
- new_quantity
- new_option_refs
- new_notes
- reason

### What is created

- a modification record on the line

### What is modified

- line fields
- order totals
- the fulfilment route notified of the delta

### What events fire

- order_line.modified

### Who is notified

- **to**: the fulfilment route; **channel**: route_native; **when**: always; **template**: line_modified; **must_include**: ['what_changed', 'previous_values']; **priority**: high; **mandatory_operational**: True
- **to**: the ordering party; **channel**: their consenting channel; **when**: the change affects the total or the promise and a surface is bound; **template**: order_changed; **cost_class**: utility

### Can it be undone

Yes.

### Concurrency behaviour

Modification takes the line row exclusively and re-checks the fulfilment state inside the transaction. A modification racing a fulfilment completion loses - the completion wins, and the modifier is told the line is already done, with what was actually produced. Any other resolution means telling somebody to change something they have already finished.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | the line is already fulfilled | This has already been done. | False | the correct path is void or return, and the message says which |
| `E_PRECONDITION` | 409 | the fulfilment route refuses the modification | This action is not available in the current state. | False | the route's refusal reason is passed through verbatim, because it is the only party that knows how far along it is |
| `E_VALIDATION` | 422 | new quantity below the already fulfilled quantity | field-specific | False | reducing below what has been produced is a void of the difference plus a decision about the cost, not a modification |
| `E_VALIDATION` | 422 | reason empty | Say why. It is shown to whoever is working on it. | False |  |
| `E_AUTHZ_FIELD` | 200 | a price-affecting change by a principal without view_financial | *(silent)* | False | the quantity and options change and the price is re-resolved by the system rather than by the actor. A person who cannot see money may still change what was ordered |

## 3. Edge cases

**EC-01.** Increasing quantity on a line already partly produced. Supported and treated as a delta to the route, not as a replacement. A route that receives a replacement will produce the whole quantity again, which is exactly the failure this action exists to prevent.

**EC-02.** Modifying a line whose route has no cancellation or modification capability. The route refuses and the correct path is void plus a new line, which the error states. The already-produced portion is recorded as produced-and-voided so its cost is visible.

**EC-03.** A modification arriving while the order is on hold. Permitted; the hold suspends routing, not modification, and modifying a held order is usually why it was held.

**EC-04.** Modification of the line notes only, with no commercial effect. Still routed to the fulfilment surface at high priority, because a note is frequently the most important part of the line and a note change that does not reach the person working is worse than no note.

**EC-05.** A consumer modifying through a self-service surface after fulfilment has started. Refused with the route's own reason, and the surface offers to contact the location instead. Silently accepting a change that cannot be honoured is how a self-service order becomes a complaint.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/order/order_line/modify_line.md`.
