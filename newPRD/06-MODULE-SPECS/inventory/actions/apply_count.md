---
doc_id: ACT-INVENTORY-APPLY_COUNT
title: Action — Apply a stock count
generated: true
source_model: _model/capabilities/inventory.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Apply a stock count

*This document is generated. Edit `_model/capabilities/inventory.yaml`, not this file.*

**Entity:** `stock_count` · **Capability:** `inventory`

**Why this exists:** The moment the system's belief is replaced by what somebody physically found. It writes corrections rather than editing balances, so that the size of the correction is permanently visible - which is the only number that tells a business whether its stock control is working.


## 1. Specification

### Who can perform it

- supervisor
- ops_manager
- finance

### Preconditions

- The count is counted or under_review.
- Every variance line has a reason where the variance exceeds the reason threshold.
- The applying principal is not the counting principal where the tenant requires review.
- The acting session is elevated where the variance value exceeds the elevation threshold.

### Inputs

- count_id
- variance_reasons
- approval_note

### What is created

- count_correction movements for every varying line

### What is modified

- count state
- location counted_at
- movements marked superseded_by_count

### What events fire

- stock.count_applied
- stock.variance_recorded

### Who is notified

- **to**: finance and ops_manager; **channel**: in_app; **when**: the variance value exceeds the finance notification threshold; **template**: count_variance; **must_include**: ['location', 'variance_value', 'largest_lines', 'reasons']
- **to**: the location custodian; **channel**: in_app; **when**: always; **template**: count_applied

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

Application takes the count row exclusively and computes each correction as the counted quantity minus the balance AT APPLICATION TIME, not minus the frozen expectation - with the movement-since already accounted for. Using the frozen expectation would re-apply every movement that happened during the count. This distinction is the single most common defect in stock counting implementations and it is why snapshot_at exists as a separate field from counted_at.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | a variance line above the threshold has no reason | Give a reason for the differences. | False | names the lines |
| `E_PRECONDITION` | 409 | the applier is the counter and review is required | This action is not available in the current state. | False | a person confirming their own count is a count with one opinion in it |
| `E_AUTHN` | 401 | variance value exceeds the elevation threshold and the session is not elevated | Confirm your identity to continue. | False |  |
| `E_CONFLICT_VERSION` | 409 | movements occurred that the movement-since calculation cannot resolve, for example a reversal of a pre-snapshot movement | Someone else changed this record. | True | the count returns to under_review with the conflicting movements named, because silently absorbing them into the variance attributes somebody else's correction to the counter |
| `E_PRECONDITION` | 409 | the count is already applied | *(silent)* | False | 2xx no-op |

## 3. Edge cases

**EC-01.** A count applied long after it was taken. The movement-since calculation grows and the variance becomes dominated by activity rather than by what was found. Beyond count_stale_hours the application is refused and a recount is required, because at that point the count is measuring the wrong thing.

**EC-02.** A blind count where the counter recorded zero for an item they simply did not look at. This is why not-found is a distinct answer from zero. Conflating them writes off the entire balance of every item the counter walked past.

**EC-03.** A variance in the same direction at the same location across consecutive counts. Applied normally and reported as a systematic pattern, because a consistent direction is shrinkage or a consistent process error, and a one-off variance is neither.

**EC-04.** Applying a count that includes items with open reservations. Reservations are untouched. A count measures on-hand, and adjusting reservations to fit a count would silently break commitments made to other capabilities.

**EC-05.** A count applied while a device is still holding unsynced consumption for that location. The unsynced movements arrive afterwards with earlier occurred_at values and would make the corrected balance wrong. The count application records the last-known sync position of every device holding stock for that location, and where any is behind, the application warns and names them. This is the only place a stock count and offline capture genuinely conflict, and it cannot be solved by the model alone.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/inventory/stock_count/apply_count.md`.
