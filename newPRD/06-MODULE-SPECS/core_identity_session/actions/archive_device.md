---
doc_id: ACT-CORE_IDENTITY_SESSION-ARCHIVE_DEVICE
title: Action — Retire a device
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Retire a device

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

**Entity:** `device` · **Capability:** `core_identity_session`

## 1. Specification

### Who can perform it

- tenant_admin
- tenant_owner

### Preconditions

- Acting session is elevated.
- Either the device is known to have no unsynced mutations, or the administrator has typed the count of mutations that will be abandoned.

### Inputs

- device_id
- reason
- acknowledged_unsynced_count

### What is created

None.

### What is modified

- device state = archived
- sessions revoked

### What events fire

- device.archived
- session.revoked

### Who is notified

- **to**: principals with an active session on the device; **channel**: push; **when**: always; **template**: device_retired; **mandatory_operational**: True

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

Archival takes the device row exclusively, so a sync cannot land between the unsynced-count check and the write. Without that lock the typed count is a check against a number that has already moved.

### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | unsynced count non-zero and not acknowledged | This device has N unsynced changes. Confirm you accept losing them. | False |  |
| `E_VALIDATION` | 422 | acknowledged count does not match the server's count | The number does not match. | False | the count may have moved because the device synced in the meantime, which is the good outcome and is stated as such |
| `E_AUTHN` | 401 | not elevated | Confirm your identity to continue. | False |  |

## 3. Edge cases

**EC-01.** An archived device that reconnects cannot mint a session and cannot upload its queue. It is told to contact an administrator, and the attempt raises an alert, because a device coming back from the dead with a queue is either a recovered handset or an attacker with a stolen one and a human must decide which.

**EC-02.** Archiving does not delete the device row. Audit rows reference device_id and must resolve to a label forever.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_identity_session/device/archive_device.md`.
