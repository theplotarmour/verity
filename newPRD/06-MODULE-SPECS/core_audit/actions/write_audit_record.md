---
doc_id: ACT-CORE_AUDIT-WRITE_AUDIT_RECORD
title: Action — Record that something happened
generated: true
source_model: _model/capabilities/core_audit.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Record that something happened

*This document is generated. Edit `_model/capabilities/core_audit.yaml`, not this file.*

**Entity:** `audit_record` · **Capability:** `core_audit`

**Why this exists:** Modelled as an explicit action because its transactional and hashing semantics are product commitments, not implementation detail. Every other capability's audit_class declaration resolves to a call to this action.


## 1. Specification

### Who can perform it

- system
- integration_principal

### Preconditions

- the calling business write is inside an open transaction
- audit_class is supplied
- actor and authority are resolved

### Inputs

- audit_class
- actor
- authority
- verb
- capability_key
- entity_key
- subject_id
- before
- after
- reason
- source
- correlation_id
- causation_id
- occurred_at
- ip
- device_id
- geo

### What is created

- audit_record

### What is modified

None.

### What events fire

None.

### Who is notified

None.

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

The hash chain requires a total order per tenant, which is a serialisation point. It is taken per tenant rather than globally, so one busy tenant cannot stall another. Rows arriving concurrently within a tenant are ordered by the sequence assigned inside the chaining lock; the lock is held for the hash computation only, not for the business transaction. Under sustained contention the chain is segmented by tenant and by day, with each segment's first row chaining the previous segment's last, which bounds the contention without breaking verification.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_INTERNAL` | 500 | the audit write fails for any reason | Something went wrong. The team has been notified. | True | THE BUSINESS TRANSACTION ROLLS BACK. This is the single most consequential decision in this capability - an action that cannot be recorded does not happen. The alternative, committing the business write and losing the audit row, produces a system whose audit trail silently has holes exactly where something went wrong |
| `E_VALIDATION` | 422 | on_behalf_of_principal_id present without a delegation or impersonation authority_kind | *(silent)* | False | internal contract violation, raised to platform_operator |
| `E_PRECONDITION` | 409 | called outside a transaction | *(silent)* | False | a programming error, caught in test rather than in production, and the reason the port contract specifies synchronous transactional delivery |

## 3. Edge cases

**EC-01.** Offline replay: occurred_at is the device's claimed business time, recorded_at is server time, and source is offline_replay. The gap between them is retained and is queryable, because a fortnight-old attendance record arriving in one burst is the shape of a fraud pattern and the shape of a phone that was broken. Verity records the fact and does not judge it.

**EC-02.** A device clock claiming an occurred_at in the future. Recorded as claimed, flagged with a clock_skew marker computed against recorded_at, and never silently corrected. Correcting it would destroy the only evidence that the device's clock was wrong.

**EC-03.** A high-volume automation writing thousands of rows in one transaction, for example a bulk import. Rows are chained in a single pass inside the transaction and one digest window absorbs them. The audit query surface must therefore support collapsing a correlation_id into one summary row that expands, or a bulk import makes the audit trail unreadable for that day.

**EC-04.** A field marked sensitive appears in before and after. It is recorded in full. Projection happens on read. This is stated explicitly because the instinct to redact at write time is strong and is wrong.

**EC-05.** An action whose subject is deleted later by a retention job. subject_label_at_time preserves the human meaning of the row. The audit row is never cascade-deleted - stated in the kernel's deletion semantics and restated here because it is the single most common thing an implementer gets wrong.

**EC-06.** Two capabilities recording the same business event from both sides, for example a work order completion and a billing event. Both rows are written and share a correlation_id. Deduplicating them would lose the fact that two different subsystems observed it.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_audit/audit_record/write_audit_record.md`.
