---
doc_id: ACT-ORDER-VOID_LINE
title: Action — Take a line off an order
generated: true
source_model: _model/capabilities/order.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Take a line off an order

*This document is generated. Edit `_model/capabilities/order.yaml`, not this file.*

**Entity:** `order_line` · **Capability:** `order`

**Why this exists:** Separated from comping deliberately. A void removes something that should not have been there; a comp gives away something that was. Merging them makes both invisible in exactly the reports where they matter.


## 1. Specification

### Who can perform it

- employee
- supervisor

### Preconditions

- the line is not fulfilled or already voided
- a reason is supplied
- the acting session is elevated where fulfilment has started

### Inputs

- line_id
- reason

### What is created

None.

### What is modified

- line state
- order totals
- reservation released
- the route asked to cancel

### What events fire

- order_line.voided

### Who is notified

- **to**: the fulfilment route; **channel**: route_native; **when**: the line was routed; **template**: line_cancelled; **priority**: high; **mandatory_operational**: True
- **to**: supervisor; **channel**: in_app; **when**: the void happened after fulfilment started, or the acting principal's void rate exceeds the alert threshold; **template**: late_void; **batching_policy**: immediate for the first, daily digest for the second

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

The reservation release and the route cancellation are issued inside the same transaction as the state change, so a voided line can never leave a reservation held. A void racing a fulfilment completion loses; the completion wins and the correct path becomes a return, which is a different authority and a different record.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | reason empty | Say why. | False |  |
| `E_AUTHN` | 401 | session not elevated while fulfilment has started | Confirm your identity to continue. | False |  |
| `E_PRECONDITION` | 409 | the line is already fulfilled | This has already been done. | False | the correct path is return_line |
| `E_DEPENDENCY` | 424 | the stock sink is unavailable and a reservation is held | *(silent)* | True | the void COMMITS and the release is queued. A void blocked by a stock outage leaves a line on an order that the customer has been told is gone |

## 3. Edge cases

**EC-01.** A void that the fulfilment route refuses because the thing is already made. The line is recorded as produced-and-voided with its cost, and that cost is reported. Absorbing it silently means the tenant never learns what late voids cost, which is the only number that would let them change the behaviour.

**EC-02.** Voiding every line on a confirmed order. The order does not auto-void; it remains confirmed with zero lines and is flagged, because voiding an order is a separate act with a separate authority and inferring it from an empty line set removes that control.

**EC-03.** A void performed to correct a mis-keyed item, immediately after capture. The overwhelmingly common case, and it must be one tap with a reason picked from a short list rather than typed. Requiring free text here is how reasons become the letter x.

**EC-04.** Void rate as a signal. Concentrated voids by one principal are reported as a pattern rather than blocked. Blocking would push the behaviour to not entering the line at all, which is invisible, whereas a high void rate is at least measurable.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/order/order_line/void_line.md`.
