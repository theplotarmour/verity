---
doc_id: ACT-ATTENDANCE_VERIFICATION-SETTLE_ATTENDANCE
title: Action — Settle attendance for pay and billing
generated: true
source_model: _model/capabilities/attendance_verification.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Settle attendance for pay and billing

*This document is generated. Edit `_model/capabilities/attendance_verification.yaml`, not this file.*

**Entity:** `attendance_record` · **Capability:** `attendance_verification`

**Why this exists:** The moment a contested record becomes two numbers that leave the system - one to a payslip and one to an invoice. Modelled as an explicit act so that somebody is accountable for both, and so that the two can differ where the contract says they do.


## 1. Specification

### Who can perform it

- supervisor
- ops_manager
- finance
- system_scheduler

### Preconditions

- The record has both a start and an end.
- No open dispute references it.
- Evidence strength meets the tenant requirement, or an unverified settlement is explicitly authorised with a reason.

### Inputs

- attendance_record_id
- agreed_start_at
- agreed_end_at
- break_minutes
- unverified_settlement_reason

### What is created

- billable outcome where the sink is bound
- payroll input where that sink is bound

### What is modified

- agreed period
- payable_minutes
- billable_minutes
- record state

### What events fire

- attendance.settled

### Who is notified

- **to**: the person; **channel**: in_app; **when**: the agreed period differs from their claim; **template**: attendance_adjusted_at_settlement; **must_include**: ['claimed', 'agreed', 'difference', 'who_settled', 'reason']; **mandatory_operational**: True
- **to**: finance; **channel**: in_app; **when**: settled unverified; **template**: unverified_settlement; **batching_policy**: one digest per period

### Can it be undone

Yes.

### Concurrency behaviour

Settlement takes the record row exclusively and emits both downstream outcomes inside the same transaction as the state change, so a settled record can never exist without its outcomes or the outcomes without it. A settlement racing a dispute: the dispute wins, because a settlement that proceeds over a live objection is exactly what the dispute mechanism exists to prevent.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | an open dispute references the record | This action is not available in the current state. | False | names the dispute and its reviewer |
| `E_PRECONDITION` | 409 | evidence strength below the tenant requirement and no authorisation supplied | This action is not available in the current state. | False | states the required strength and the strength actually held, so the supervisor knows what would fix it |
| `E_VALIDATION` | 422 | the agreed period differs from both the claim and the verified period with no adjustment recorded | Record why the hours differ. | False | settlement may not silently invent a third period. Any difference is an adjustment with a reason |
| `E_AUTHZ_FIELD` | 200 | billable_minutes supplied without view_financial | *(silent)* | False | dropped. payable_minutes is not gated, so a supervisor without financial access can still settle somebody's pay - which is the correct separation |
| `E_DEPENDENCY` | 424 | a bound sink is unavailable | A required service is unavailable. | True | settlement is REFUSED rather than committing without emitting. A settled record whose outcomes never reached billing or payroll is a person unpaid or a counterparty unbilled, discovered weeks later by manual reconciliation |
| `E_PRECONDITION` | 409 | the containing period is already locked | This action is not available in the current state. | False | the correct path is a post-lock adjustment |

## 3. Edge cases

**EC-01.** Payable and billable minutes differing legitimately - a person paid for a full period while a counterparty is billed only for the covered portion, or a rounding rule applying to one and not the other. Fully supported and is the reason the two are separate fields. A model with one number is wrong for one of the two parties every time they differ.

**EC-02.** Bulk settlement at period end across hundreds of records. Supported as a batch sharing one correlation_id, with each record settled individually so one failure does not roll back the rest, and a summary showing exactly which records did not settle and why. A bulk operation that reports only a count is one nobody can act on.

**EC-03.** Settling unverified because a location has no signal and never will. Permitted with a reason, reported, and the resulting billable outcome carries the unverified marker so that a counterparty disputing the line is shown the truth rather than an assertion.

**EC-04.** A rounding rule that always rounds in the tenant's favour. Expressible, and the model records the rounding as an explicit adjustment of kind rounding rather than folding it into the agreed period. Whether the rule is fair is not this capability's judgement; making it visible is.

**EC-05.** Settlement of a record whose commitment was later cancelled. Still settles. The person attended; a cancellation after the fact does not undo that, and the billable classification is a separate question for the contract.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/attendance_verification/attendance_record/settle_attendance.md`.
