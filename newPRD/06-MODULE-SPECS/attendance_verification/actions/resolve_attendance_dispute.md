---
doc_id: ACT-ATTENDANCE_VERIFICATION-RESOLVE_ATTENDANCE_DISPUTE
title: Action — Resolve a disputed attendance record
generated: true
source_model: _model/capabilities/attendance_verification.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Resolve a disputed attendance record

*This document is generated. Edit `_model/capabilities/attendance_verification.yaml`, not this file.*

**Entity:** `attendance_dispute` · **Capability:** `attendance_verification`

## 1. Specification

### Who can perform it

- supervisor
- ops_manager
- tenant_owner

### Preconditions

- the dispute is under_review or escalated
- the resolver is not the raiser
- an outcome and a reason are supplied

### Inputs

- dispute_id
- outcome
- outcome_reason
- agreed_start_at
- agreed_end_at
- financial_effect_minor

### What is created

- attendance_adjustment where the outcome changes the period

### What is modified

- dispute state and outcome
- attendance record state

### What events fire

- attendance.dispute_resolved

### Who is notified

- **to**: both parties; **channel**: in_app_and_their_preferred_channel; **when**: always; **template**: dispute_resolved; **must_include**: ['outcome', 'reason', 'resulting_period', 'resulting_pay_effect', 'how_to_escalate']; **mandatory_operational**: True
- **to**: ops_manager; **channel**: in_app; **when**: the outcome is upheld against the tenant's own record; **template**: record_quality_signal; **note**: a rising rate of upheld disputes is a signal about the capture process rather than about the people

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

The dispute is claimed before resolution, so two reviewers cannot resolve it differently. The claim times out rather than persisting, so a reviewer on leave does not park somebody's pay.

### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | the resolver raised the dispute | This action is not available in the current state. | False | deciding one's own dispute is not a resolution, and the message is deliberately not specific enough to teach a workaround |
| `E_VALIDATION` | 422 | outcome_reason empty | Write the reason. Both parties will see it. | False |  |
| `E_VALIDATION` | 422 | outcome partially_upheld with no resulting period supplied | Say what the agreed hours are. | False |  |
| `E_AUTHZ_FIELD` | 200 | financial_effect_minor supplied without view_financial | *(silent)* | False | dropped and reported |
| `E_PRECONDITION` | 409 | the containing period locked while the dispute was open | *(silent)* | False | resolution still proceeds and produces a post-lock adjustment rather than editing the locked record. A dispute must never be blocked by a period closing, because the period closing is frequently what prompted it |

## 3. Edge cases

**EC-01.** A dispute upheld after the person has already been paid the lower amount. The adjustment is written against the locked record and flows to the next payroll input as a correction. The notification states plainly when the correction will be paid, because the question the person is actually asking is when, not whether.

**EC-02.** A dispute raised by a counterparty against hours already billed. Resolution produces an adjustment with affects_billing true and affects_pay false, so a credit to a counterparty does not silently reduce somebody's wages. This is the whole reason the two flags are independent.

**EC-03.** Both parties rejecting the proposed outcome. Escalation, not resolution. There is no mechanism inside Verity that compels agreement, and the model does not pretend otherwise - the escalated state exists so that the disagreement is visible to somebody with the authority to end it.

**EC-04.** A dispute where the evidence is inconclusive on both sides, which is the common case with indoor geofences. The resolver must choose and record why. The model deliberately offers no default, because a default here is a rule about who loses when nobody can prove anything, and that rule belongs to the business rather than to the software.

**EC-05.** A pattern of disputes concentrated at one location. Surfaced to ops_manager as a record-quality signal about the capture process at that location, not as a performance signal about the people there. Which of the two it is presented as determines whether the data gets fixed or the workforce gets blamed.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/attendance_verification/attendance_dispute/resolve_attendance_dispute.md`.
