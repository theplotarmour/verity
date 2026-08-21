---
doc_id: ACT-SLA_CONTRACT-EXCLUDE_MEASUREMENT
title: Action — Exclude a measurement from performance
generated: true
source_model: _model/capabilities/sla_contract.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Exclude a measurement from performance

*This document is generated. Edit `_model/capabilities/sla_contract.yaml`, not this file.*

**Entity:** `sla_measurement` · **Capability:** `sla_contract`

**Why this exists:** Genuine exclusions exist - a counterparty-caused delay, a force majeure day, a duplicate record. They are also the easiest way to make a performance report say whatever is wanted, so the model permits them and makes the rate impossible to hide.


## 1. Specification

### Who can perform it

- ops_manager
- finance
- tenant_owner

### Preconditions

- acting session is elevated
- a reason is supplied
- the measurement is not part of an already-applied penalty obligation

### Inputs

- measurement_id
- exclusion_reason

### What is created

None.

### What is modified

- measurement excluded flag
- dependent aggregations recomputed
- dependent obligations recalculated as new versions

### What events fire

- sla.measurement_excluded

### Who is notified

- **to**: finance and the contract owner; **channel**: in_app; **when**: always; **template**: measurement_excluded; **must_include**: ['level_label', 'subject_reference', 'reason', 'actor_display_name']
- **to**: tenant_owner; **channel**: in_app; **when**: the period exclusion rate exceeds exclusion_rate_alert; **template**: exclusion_rate_high; **must_include**: ['rate', 'reasons_grouped', 'principals_named']

### Can it be undone

Yes.

### Concurrency behaviour

Exclusion recomputes dependent aggregations under a lock on the measurement period, so an exclusion landing while a penalty is being calculated cannot produce a penalty computed from a set that no longer exists. Where an obligation was already submitted, a new version of it is raised rather than the original being edited.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | reason empty | Give a reason. It is shown to finance and the contract owner. | False |  |
| `E_PRECONDITION` | 409 | the measurement belongs to an applied penalty obligation | This action is not available in the current state. | False | the correct path is a credit or an adjustment through billing, because the money has already moved and un-excluding it here would make the two systems disagree |
| `E_AUTHN` | 401 | session not elevated | Confirm your identity to continue. | False |  |
| `E_PRECONDITION` | 409 | the measurement is disputed | This action is not available in the current state. | False | excluding a disputed measurement would resolve the dispute by removing its subject, which is not a resolution |

## 3. Edge cases

**EC-01.** Bulk exclusion of a whole day, for instance a site closure caused by the counterparty. Supported as a batch sharing one reason and one correlation_id, and it counts as many exclusions rather than one for the purposes of the rate alert - because the rate alert exists to make the volume visible and a batch would otherwise hide it.

**EC-02.** Excluding a measurement that is currently the only one in its period. The aggregation becomes undefined rather than perfect. A period with every measurement excluded reports as not measured, never as fully met, because a performance report of one hundred percent with nothing measured is the artefact this capability most needs to avoid producing.

**EC-03.** Exclusion by the principal whose own operation caused the breach. Permitted where they hold the role, and the notification names them. The control is that finance and the contract owner always see it, not that the operation is prevented from asking.

**EC-04.** A counterparty who can see performance through the surface noticing an exclusion. Exclusions are visible in the counterparty projection with their reason category, because a performance figure that silently improved is the fastest way to lose a contract argument.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/sla_contract/sla_measurement/exclude_measurement.md`.
