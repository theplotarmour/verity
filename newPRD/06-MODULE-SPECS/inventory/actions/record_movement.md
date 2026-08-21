---
doc_id: ACT-INVENTORY-RECORD_MOVEMENT
title: Action — Record a stock movement
generated: true
source_model: _model/capabilities/inventory.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Record a stock movement

*This document is generated. Edit `_model/capabilities/inventory.yaml`, not this file.*

**Entity:** `stock_movement` · **Capability:** `inventory`

**Why this exists:** The only way a balance ever changes. Made a single explicit action across every movement kind so that reason, actor, evidence and idempotency are uniform, rather than each consuming capability inventing its own path into the ledger.


## 1. Specification

### Who can perform it

- employee
- supervisor
- ops_manager
- system
- integration_principal

### Preconditions

- The item resolves and is stocked.
- At least one of the from and to locations is supplied and is active.
- A reason key valid for the movement kind is supplied.
- The quantity is positive and its unit matches the item's unit or converts by a declared factor.

### Inputs

- item_ref
- from_location_id
- to_location_id
- quantity
- unit_of_measure
- movement_kind
- reason_key
- reason_note
- source_ref
- batch_ref
- expires_on
- occurred_at
- evidence_ref
- client_movement_token

### What is created

- stock_movement
- a reservation discharge where one is named

### What is modified

- derived balances
- reservation state

### What events fire

- stock.moved
- stock.balance_changed
- stock.went_negative

### Who is notified

- **to**: the location custodian and ops_manager; **channel**: in_app; **when**: the movement drives the balance negative; **template**: negative_balance; **must_include**: ['item', 'location', 'resulting_quantity', 'likely_missing_receipt']; **batching_policy**: one digest per location per hour
- **to**: the location custodian; **channel**: in_app; **when**: the resulting balance is below the item's reorder point where one is configured; **template**: low_stock; **batching_policy**: daily digest

### Can it be undone

Yes.

### Concurrency behaviour

The ledger is append-only, so movements do not contend with each other and a movement never blocks another movement. Balance is derived by summation over the ledger with a periodically materialised checkpoint, so a hot item does not serialise. Reservation discharge takes the reservation row, and the negative-balance check is advisory rather than a constraint - deliberately, because a constraint would refuse to record physical reality and the ledger would then be wrong in a way nobody could see.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | no reason key, or a reason key not valid for this movement kind | Choose a reason. | False | mandatory on every kind. An unreasoned adjustment is where inconvenient truth is hidden, and the closed list is what makes the adjustment report readable |
| `E_VALIDATION` | 422 | unit of measure does not match and no conversion factor is declared | This is measured in a different unit. | False | refused rather than converted by assumption, because an assumed conversion is the classic silent factor-of-a-thousand error |
| `E_PRECONDITION` | 409 | the movement would go negative at a location where allows_negative is false | This action is not available in the current state. | False | names the shortfall. This is the one place negative is refused, and it is opt-in per location rather than the default, because refusing to record consumption that has physically happened makes the ledger fiction |
| `E_PRECONDITION` | 409 | the item is not stocked | This action is not available in the current state. | False | the consuming capability should be recording it as free text instead, and the message says so |
| `E_AUTHZ_FIELD` | 200 | unit_cost_minor supplied without view_financial | *(silent)* | False | dropped, and the valuation method supplies the cost instead. Quantity is unaffected, because a store person must be able to record what left the shelf |
| `E_VALIDATION` | 422 | occurred_at more than movement_backdate_limit_days in the past | That is too far back. | False | the correct path is an adjustment with a reason, which is separately reported. Arbitrary backdating on the ordinary path lets a ledger be rewritten quietly |
| `E_DEPENDENCY` | 424 | the catalogue is unavailable | *(silent)* | True | on a device with a cached item set the movement is recorded against the cached item and re-validated on sync. Refusing to record physical movement because a catalogue service is down is how a store room reverts to paper |

## 3. Edge cases

**EC-01.** Consumption recorded offline in a store room with no signal, which is the normal case. Queued with occurred_at from the device. On sync the movements apply in occurred_at order, so a receipt recorded after a consumption but occurring before it produces the right intermediate balances. Applying in arrival order instead would produce spurious negative balances and a stream of false alerts.

**EC-02.** A movement driving the balance negative. Recorded, and a distinct event is emitted. Negative stock is a fact - it means a receipt was missed, or a count was wrong, or something was taken without being recorded - and all three are findable only if the negative is allowed to exist. The alert names the most likely cause, which is a missing receipt, because that is what it is nine times out of ten.

**EC-03.** Two capabilities consuming the same stock concurrently for different work. Both succeed; the ledger has no contention. The balance may go negative and the negative is the signal. Locking to prevent it would serialise the busiest item in the operation at the busiest moment.

**EC-04.** A movement whose source is later cancelled - a work order voided after parts were fitted. The movement is NOT automatically reversed, because the parts were physically consumed. The reversal is a separate decision with its own reason, and leaving it to a human is the only way to distinguish parts returned to the shelf from parts already installed.

**EC-05.** Batch and expiry recorded on a receipt. Consumption does not automatically select a batch. Which batch left is a physical fact the person recording it knows and the system does not, so it is captured rather than inferred, and where it is not captured the movement records that the batch is unknown rather than guessing the oldest.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/inventory/stock_movement/record_movement.md`.
