---
doc_id: ACT-ORDER-SPLIT_ORDER
title: Action — Split an order
generated: true
source_model: _model/capabilities/order.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Split an order

*This document is generated. Edit `_model/capabilities/order.yaml`, not this file.*

**Entity:** `order` · **Capability:** `order`

**Why this exists:** Two parties paying separately is a commercial act producing two documents that must both reconcile. Modelling it as a display trick produces a payment that reconciles to nothing.


## 1. Specification

### Who can perform it

- employee
- supervisor

### Preconditions

- the order is confirmed or partially fulfilled
- at least one line remains on each side
- no line is split across both sides

### Inputs

- order_id
- line_ids_to_move
- new_party_ref
- reason

### What is created

- a new order carrying the moved lines with split_of_order_id set

### What is modified

- both orders' totals
- both orders' payment positions
- fulfilment routes told of the reassignment

### What events fire

- order.split

### Who is notified

- **to**: the fulfilment routes holding moved lines; **channel**: route_native; **when**: always; **template**: line_reassigned; **note**: the physical work does not change and the commercial ownership does, and a route that is not told will attribute completion to the wrong order

### Can it be undone

Yes.

### Concurrency behaviour

Both orders are locked in a canonical id order and the split is one transaction, so no instant exists where a line belongs to both or to neither. Totals on both sides are recomputed from their line sets rather than transferred, because transferring a computed figure is how the two sides end up not summing to the original.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | the split would leave one side with no lines | Both parts need at least one line. | False | a split producing an empty order is a reference number attached to nothing, and it will be chased by somebody |
| `E_PRECONDITION` | 409 | a payment has already been taken against the whole order | This action is not available in the current state. | False | the correct path is a refund and re-take, or a manual allocation, because splitting a captured payment is a payment-provider operation this capability may not perform |
| `E_PRECONDITION` | 409 | a line to be moved is already fulfilled and its billable outcome emitted | This action is not available in the current state. | False | moving an already-billed line would produce two billable outcomes for one piece of work |
| `E_VALIDATION` | 422 | a single line is to be divided between the two sides | Split a line into two lines first. | False | dividing one line across two orders makes the quantity and the price ambiguous on both, so the model requires the division to be explicit |

## 3. Edge cases

**EC-01.** Splitting an order where only some lines have been fulfilled. Fulfilled lines whose outcomes have not yet been emitted may move; those already emitted may not. The error names which, so the person can decide rather than guess.

**EC-02.** Splitting to an anonymous party. Fully supported; the new order simply has no party. The common case is one person paying for their own items out of a group.

**EC-03.** Splitting a line that itself carries a comp or an override. The adjustment travels with the line, together with the principal who authorised it, so authority is never laundered by moving a line to a different order.

**EC-04.** Splitting an order that is subject to a contract-scoped price. The moved lines are NOT re-priced. Re-pricing on split would change what a customer was quoted at the moment they asked to pay separately, which is the worst possible moment to change a number.

**EC-05.** Repeated splitting. Supported; split_of_order_id chains and every part points at its immediate origin. Reporting resolves the chain to its root, with a depth guard that alerts rather than looping.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/order/order/split_order.md`.
