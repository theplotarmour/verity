---
doc_id: ACT-ORDER-CAPTURE_LINE
title: Action — Add something to an order
generated: true
source_model: _model/capabilities/order.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Add something to an order

*This document is generated. Edit `_model/capabilities/order.yaml`, not this file.*

**Entity:** `order_line` · **Capability:** `order`

**Why this exists:** The action performed more often than any other in a high-volume operation, frequently several times a minute under pressure. Its speed determines whether the software is used or bypassed, and its idempotency determines whether a slow connection produces one line or three.


## 1. Specification

### Who can perform it

- employee
- supervisor
- consumer
- integration_principal

### Preconditions

- the order is in draft or confirmed-and-modifiable
- the item resolves and is available for this location and channel
- the option selection satisfies its group rules

### Inputs

- order_id
- item_ref
- selected_option_refs
- quantity
- notes
- client_line_token

### What is created

- order_line
- an order in draft where none was supplied

### What is modified

- order totals
- pricing snapshot on first line

### What events fire

- order_line.captured

### Who is notified

None.

### Can it be undone

Yes.

### Concurrency behaviour

Two people adding lines to one order concurrently both succeed; line_number is allocated under the order row lock so it is contiguous and stable. Totals are recomputed from the line set rather than incremented, so a lost update cannot leave a total that disagrees with its lines. Recomputing rather than incrementing is slower and is the only version that is correct under concurrency.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | the item is unavailable at this location, channel or instant | This action is not available in the current state. | False | states the reason - out of window, out of components, discontinued - because the person is standing in front of somebody who asked for it and needs to say something |
| `E_VALIDATION` | 422 | the option selection violates a group rule | field-specific | False | names the group and what is required |
| `E_VALIDATION` | 422 | quantity zero or negative | Enter how many. | False |  |
| `E_PRECONDITION` | 409 | the order has closed or voided | This action is not available in the current state. | False |  |
| `E_PRECONDITION` | 409 | the line cannot be priced and the tenant does not permit unpriced capture | This has no price yet. | False | the line is still CAPTURED and shown as unpriced where the tenant permits it, because refusing capture at the counter is worse than capturing something that needs a price |
| `E_DEPENDENCY` | 424 | the catalogue is unavailable | A required service is unavailable. | True | on an online device the capture is refused. On a device with a catalogue cache the line is captured against the cached item and re-resolved on sync, which is the whole reason the cache exists |
| `E_QUOTA` | 402 | more than max_lines_per_order | Plan limit reached. | False |  |

## 3. Edge cases

**EC-01.** Captured offline against a cached catalogue. The line records the cache age and the cached price, and is re-priced on sync. Where the re-priced amount differs, the difference is raised as a conflict rather than silently applied, because somebody has already told a customer a number. This is the single most consequential offline behaviour in the capability.

**EC-02.** Two identical lines added deliberately. Both persist as separate lines. Collapsing them into a quantity of two is a display choice and must never be a storage choice, because they may be fulfilled separately, modified separately or voided separately.

**EC-03.** A line captured for an item that becomes unavailable between capture and confirmation. The line is retained and flagged at confirmation rather than removed. Removing somebody's line without telling them is how an order silently ships short.

**EC-04.** Capture by a consumer through a self-service surface with an option combination that is valid but nonsensical. The model validates only against declared group rules; it has no opinion about sense. Anything more is a catalogue configuration concern and pretending otherwise would put pack-specific logic here, which AET-01 would catch.

**EC-05.** A line captured against an order that another device has already confirmed. Permitted where the order is still modifiable, and the confirmation state is re-evaluated. This is the normal shape of somebody adding one more thing after saying they were finished.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/order/order_line/capture_line.md`.
