---
doc_id: ACT-ASSETS-TRANSFER_CUSTODY
title: Action — Hand an asset over
generated: true
source_model: _model/capabilities/assets.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Hand an asset over

*This document is generated. Edit `_model/capabilities/assets.yaml`, not this file.*

**Entity:** `asset` · **Capability:** `assets`

**Why this exists:** Custody is the fact that decides who answers when something is missing. Modelled as an explicit two-sided act rather than an edit to a field, because an unacknowledged transfer is exactly how an asset becomes nobody's responsibility.


## 1. Specification

### Who can perform it

- employee
- supervisor
- ops_manager

### Preconditions

- the asset is not disposed
- a receiving custodian is named
- the acting principal is the current custodian or holds edit on asset at a covering scope

### Inputs

- asset_id
- to_custodian_principal_id
- to_location_ref
- condition
- condition_note
- evidence_ref
- reason

### What is created

- a custody transfer record

### What is modified

- asset custodian
- location
- condition
- condition_assessed_at

### What events fire

- asset.custody_transferred

### Who is notified

- **to**: the receiving custodian; **channel**: push_and_in_app; **when**: always; **template**: asset_handed_to_you; **must_include**: ['tag', 'name', 'condition_stated', 'who_from']; **mandatory_operational**: True
- **to**: the previous custodian; **channel**: in_app; **when**: the transfer was initiated by somebody else; **template**: asset_taken_from_you
- **to**: supervisor; **channel**: in_app; **when**: the transfer is not acknowledged within the acknowledgement window; **template**: unacknowledged_transfer

### Can it be undone

Yes.

### Concurrency behaviour

Custody is a single-valued field written under the asset row lock, so two concurrent transfers serialise and the loser is told who currently holds it. The transfer record is appended regardless, so an attempted transfer that lost a race is still visible - which matters, because two people both believing they handed something to a third is exactly how a loss investigation stalls.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | the asset is disposed or lost | This action is not available in the current state. | False | for a lost asset the correct act is record_recovery, and the message says so |
| `E_VALIDATION` | 422 | the receiving custodian is the current one | This is already theirs. | False |  |
| `E_AUTHZ_SCOPE` | 404 | the receiving custodian is outside the acting principal's scope | Not found. | False |  |
| `E_VALIDATION` | 422 | condition not stated where the tenant requires it on transfer | Say what condition it is in. | False | a transfer with no condition statement is how a dispute about who broke something becomes unresolvable |
| `E_CONFLICT_VERSION` | 409 | custody changed since the screen loaded | Someone else changed this record. | True | names the current custodian |

## 3. Edge cases

**EC-01.** A transfer the receiving custodian never acknowledges. The custody changes immediately and the lack of acknowledgement is reported, because holding the transfer pending acknowledgement would leave the asset with the person who no longer has it. Acknowledgement is evidence, not a gate.

**EC-02.** A transfer to somebody whose engagement ends before they acknowledge. The asset returns to the transferring custodian automatically and both are told, because an asset held by a departed person is a loss waiting to be discovered at a count.

**EC-03.** Condition recorded differently by the two parties. Both statements are retained on the transfer record. The model does not reconcile them; a difference between what the giver said and what the receiver said is precisely the evidence a later damage dispute needs.

**EC-04.** Bulk transfer when a custodian leaves. Supported as a batch with one reason and one correlation id, so the receiving custodian gets one message listing everything rather than forty messages.

**EC-05.** A transfer recorded offline at a handover in the field. Queued with its evidence as one unit. Where two offline transfers of one asset sync in conflicting order, both records are retained, the later read_at wins for the current custodian, and the conflict is surfaced rather than resolved silently.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/assets/asset/transfer_custody.md`.
