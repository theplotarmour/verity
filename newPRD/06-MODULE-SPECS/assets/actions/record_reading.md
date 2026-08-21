---
doc_id: ACT-ASSETS-RECORD_READING
title: Action — Record a meter reading
generated: true
source_model: _model/capabilities/assets.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Record a meter reading

*This document is generated. Edit `_model/capabilities/assets.yaml`, not this file.*

**Entity:** `meter_reading` · **Capability:** `assets`

**Why this exists:** Readings drive maintenance demand, usage-based depreciation and frequently billing. They are entered by somebody standing in front of a counter, get transposed, go backwards when a counter is replaced, and are estimated when nobody can reach the thing. Every one of those has to be recordable and distinguishable.


## 1. Specification

### Who can perform it

- employee
- supervisor
- integration_principal
- system

### Preconditions

- the asset exists and is not disposed
- the meter key is defined on its class

### Inputs

- asset_id
- meter_key
- value
- unit
- read_at
- source
- evidence_ref

### What is created

- meter_reading

### What is modified

- plan next_due_meter_value
- plausibility assessment

### What events fire

- asset.reading_recorded
- asset.reading_implausible

### Who is notified

- **to**: the custodian and the supervisor; **channel**: in_app; **when**: plausibility is implausible_jump or went_backwards; **template**: reading_needs_review; **must_include**: ['previous_value', 'new_value', 'delta', 'previous_read_at']; **batching_policy**: daily digest

### Can it be undone

Yes.

### Concurrency behaviour

Readings are append-only and do not contend. Plausibility is assessed against the latest reading at write time and is frozen; a later out-of-order reading does not retrospectively change an earlier assessment, because that assessment is what somebody acted on.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | the meter key is not defined on the asset's class | This asset does not have that meter. | False | names the meters it does have |
| `E_VALIDATION` | 422 | unit does not match the meter definition | field-specific | False | refused rather than converted. An assumed conversion between hours and kilometres is not a rounding error, it is a different quantity |
| `E_VALIDATION` | 422 | a negative value on a cumulative meter | field-specific | False |  |
| `E_PRECONDITION` | 409 | the value is lower than the previous reading on a cumulative meter | *(silent)* | False | ACCEPTED and marked went_backwards. Counters are replaced, roll over and are misread, and rejecting the reading means the true current value never gets recorded at all |
| `E_PRECONDITION` | 409 | the delta exceeds the plausibility threshold for the meter | *(silent)* | False | accepted and marked implausible_jump. A transposed digit and a genuinely heavy month look identical to a threshold and only a person can tell them apart |
| `E_PRECONDITION` | 409 | the asset is disposed | This action is not available in the current state. | False |  |

## 3. Edge cases

**EC-01.** A replaced counter reading from zero. Recorded as went_backwards and resolved by a rollover_correction reading that records the retired counter's final value and the new counter's start, so cumulative usage across the replacement remains derivable. Without this the asset's lifetime usage resets and every usage-based plan and depreciation figure silently restarts.

**EC-02.** An estimated reading because the asset could not be reached. Recorded with source=estimated. Plans still compute from it and every downstream artefact carries the estimation through, so a maintenance record built on estimates is visibly built on estimates.

**EC-03.** A reading entered days after it was taken. read_at and recorded_at are both retained, plans compute from read_at, and the gap is visible. Computing from recorded_at would push every due date later by however long the paperwork took.

**EC-04.** Two readings for one asset arriving out of order from an offline device. Both are stored, the series is ordered by read_at, and each carries the plausibility assessment made at its own write time. The frozen assessment matters because a technician may already have been dispatched on the strength of it.

**EC-05.** A reading that triggers a plan whose demand is already open. The plan generates one demand, not two, because generation is idempotent per plan per due point. Duplicate maintenance work orders are the classic failure of meter-driven maintenance.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/assets/meter_reading/record_reading.md`.
