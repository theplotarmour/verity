---
doc_id: ACT-INVENTORY-RESERVE_STOCK
title: Action — Reserve stock
generated: true
source_model: _model/capabilities/inventory.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Reserve stock

*This document is generated. Edit `_model/capabilities/inventory.yaml`, not this file.*

**Entity:** `stock_reservation` · **Capability:** `inventory`

## 1. Specification

### Who can perform it

- system
- employee
- supervisor
- integration_principal

### Preconditions

- the item is stocked
- the location is active
- the quantity is positive

### Inputs

- item_ref
- location_id
- quantity
- unit_of_measure
- source_capability_key
- source_ref
- expires_at

### What is created

- stock_reservation

### What is modified

- derived available quantity

### What events fire

- stock.reserved

### Who is notified

- **to**: the location custodian; **channel**: in_app; **when**: the reservation drives available below zero; **template**: over_reserved; **batching_policy**: hourly digest

### Can it be undone

Yes.

### Concurrency behaviour

Reservations are appended and available is derived, so two concurrent reservations do not contend and both succeed even where they exceed on-hand. Over-reservation is reported rather than prevented, for the same reason negative stock is - a refusal here means a forward commitment cannot be recorded, and it will then be made anyway and recorded nowhere.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | quantity not positive | field-specific | False |  |
| `E_PRECONDITION` | 409 | the location is suspended or retired | This action is not available in the current state. | False |  |
| `E_VALIDATION` | 422 | expires_at in the past | field-specific | False |  |
| `E_QUOTA` | 402 | more than max_open_reservations_per_source | Plan limit reached. | False | catches a workflow creating a reservation per attempt rather than per claim |

## 3. Edge cases

**EC-01.** A reservation with no expiry. Permitted and monitored, because a genuinely open-ended reservation exists - stock set aside for a long-running commitment - and forbidding it would push the practice into a physically separated shelf that the system knows nothing about.

**EC-02.** Reserving more than is on hand. Permitted where the location allows negative. Available goes negative, which is the honest representation of having promised more than is held, and it is exactly the number a purchaser needs.

**EC-03.** A reservation whose source disappears - the claiming capability is disabled. The reservation persists and appears in the open-reservation monitor with its source named as unavailable. Auto-releasing on capability disable would free stock that a re-enabled capability still expects.

**EC-04.** Consuming against the wrong reservation. Not prevented; reservations are claims and the movement records which one it discharged. The reconciliation is visible because both the reservation and the movement carry their source references.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/inventory/stock_reservation/reserve_stock.md`.
