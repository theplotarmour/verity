---
doc_id: ACT-EVIDENCE_CAPTURE-REDACT_EVIDENCE
title: Action — Redact evidence
generated: true
source_model: _model/capabilities/evidence_capture.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Redact evidence

*This document is generated. Edit `_model/capabilities/evidence_capture.yaml`, not this file.*

**Entity:** `evidence_item` · **Capability:** `evidence_capture`

**Why this exists:** Evidence routinely captures more than was intended - a bystander in a photograph, a document in the background, a face where only a serial number was wanted. Redaction has to exist, and it has to be impossible to use as a way of editing history.


## 1. Specification

### Who can perform it

- supervisor
- ops_manager
- tenant_owner

### Preconditions

- acting session is elevated
- a reason is supplied
- no legal hold forbids alteration

### Inputs

- item_id
- reason
- redaction_kind

### What is created

None.

### What is modified

- content replaced or masked
- redaction fields set

### What events fire

- evidence.redacted

### Who is notified

- **to**: the capturing principal; **channel**: in_app; **when**: always; **template**: your_evidence_redacted; **must_include**: ['subject_reference', 'reason', 'actor_display_name']
- **to**: tenant_owner; **channel**: in_app; **when**: the redaction rate exceeds the alert threshold; **template**: redaction_rate_high

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

Redaction takes the item exclusively and writes the audit row in the same transaction. A redaction racing an expiry: expiry wins if it lands first and the redaction becomes a no-op against a tombstone, which is correct - the content is gone either way and the difference is only in the reason recorded.


### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | a legal hold covers the item | This action is not available in the current state. | False | names the hold. A hold prevents alteration as well as deletion, and this is the one place the two are the same thing |
| `E_VALIDATION` | 422 | reason empty | Write the reason. It is recorded permanently. | False |  |
| `E_AUTHN` | 401 | session not elevated | Confirm your identity to continue. | False |  |
| `E_PRECONDITION` | 409 | the item is still pending upload | This action is not available in the current state. | False | there is nothing stored to redact, and the correct act is to instruct the device to discard, which is a different action with a different record |

## 3. Edge cases

**EC-01.** Redacting a photograph that is the only evidence supporting an invoiced line. Permitted, and the owning record is marked as having had its evidence redacted, so that a subsequent dispute is answered with the truth rather than with an apparent absence. Preventing the redaction would make the platform unable to comply with a legitimate request; hiding its consequence would be worse.

**EC-02.** A redaction request arising from a data-subject request. Handled here for the content and by core_audit for the audit rows, and the two are deliberately separate because their retention obligations differ. The conflict between a request and an active legal hold resolves in favour of the hold, and both the request and the conflict are recorded.

**EC-03.** Masking rather than destroying - blurring a face while keeping the rest of a photograph. Supported as a redaction kind, and it produces a new content hash while retaining the original hash, so the transformation is provable and the original is not recoverable from the record.

**EC-04.** Redaction of an item that has already expired. A no-op against the tombstone, recorded, because somebody asked and the fact that they asked is itself worth keeping.

**EC-05.** Bulk redaction across a set - every photograph from one shift. Supported as a batch sharing a correlation id and one reason, and counted as many redactions rather than one for the rate monitor, because the monitor exists to make volume visible and a batch would otherwise hide it.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/evidence_capture/evidence_item/redact_evidence.md`.
