---
doc_id: ACT-SLA_CONTRACT-PAUSE_CLOCK
title: Action — Pause a service-level clock
generated: true
source_model: _model/capabilities/sla_contract.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Pause a service-level clock

*This document is generated. Edit `_model/capabilities/sla_contract.yaml`, not this file.*

**Entity:** `sla_measurement` · **Capability:** `sla_contract`

**Why this exists:** The most contested operation in this capability. Pausing is how an unachievable target becomes achievable, so the authority to pause belongs to the contract and not to the operation being measured.


## 1. Specification

### Who can perform it

- system
- supervisor
- ops_manager

### Preconditions

- the measurement is running
- the reason key appears in the level's pausable_reason_keys
- the pause ceiling is not exhausted

### Inputs

- measurement_id
- reason_key
- note
- paused_at

### What is created

- a pause interval on the measurement

### What is modified

- measurement state
- total_paused_minutes accrual

### What events fire

- sla.clock_paused

### Who is notified

- **to**: ops_manager; **channel**: in_app; **when**: the pause reason concentration threshold is exceeded for this level; **template**: pause_pattern; **batching_policy**: weekly digest

### Can it be undone

Yes.

### Concurrency behaviour

Pause and resume are applied under the measurement row lock and the accrual is computed from interval boundaries rather than from a running total, so a lost update cannot silently credit paused minutes. Two concurrent pauses collapse to one interval.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | the reason is not in pausable_reason_keys | This action is not available in the current state. | False | the response includes the permitted reasons so the caller can present them. This refusal is the mechanism that makes the contract the authority on pausing, and it is the single most important guard in this capability |
| `E_PRECONDITION` | 409 | max_pause_minutes is already exhausted | This action is not available in the current state. | False | names the ceiling and the minutes already used |
| `E_PRECONDITION` | 409 | the measurement is already paused | *(silent)* | False | 2xx no-op |
| `E_PRECONDITION` | 409 | the measurement has stopped | This action is not available in the current state. | False |  |
| `E_VALIDATION` | 422 | paused_at before started_at or in the future | *(silent)* | False | clamped to now with the clamping recorded, because a pause backdated before the clock started would produce negative elapsed time |

## 3. Edge cases

**EC-01.** A pause reason that the operational capability considers legitimate and the contract does not. Refused, and the refusal is surfaced to the operator with the permitted reasons. This is the designed friction - the alternative is a work order that can pause its own clock and therefore meet any target.

**EC-02.** The pause ceiling being reached while the underlying blocker persists. The clock resumes automatically and the forced resume is recorded distinctly from a voluntary one. The operator is told, because from their point of view a blocked record has just started accruing against a deadline again and they need to escalate rather than wait.

**EC-03.** Several pauses in one measurement. Fully supported; intervals accumulate. The concentration monitor looks at reasons across measurements rather than within one, because one long pause and six short ones for the same reason are the same finding.

**EC-04.** Pausing a measurement whose subject is in a state the operational capability considers active. Permitted - pausing is a contractual statement about the clock, not an operational statement about the work, and conflating them is why the two are separate capabilities.

**EC-05.** A pause applied while the counterparty is watching a live status through the customer surface. The pause and its reason category are visible to them, the free-text note is not. A clock that visibly stops with no reason shown is worse for trust than one that keeps running.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/sla_contract/sla_measurement/pause_clock.md`.
