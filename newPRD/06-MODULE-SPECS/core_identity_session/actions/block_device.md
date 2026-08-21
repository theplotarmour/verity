---
doc_id: ACT-CORE_IDENTITY_SESSION-BLOCK_DEVICE
title: Action — Block a device
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Block a device

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

**Entity:** `device` · **Capability:** `core_identity_session`

**Why this exists:** The lost-or-stolen-handset action. It must be one tap from the device list and must take effect without the device's cooperation.

## 1. Specification

### Who can perform it

- tenant_admin
- tenant_owner
- platform_operator

### Preconditions

- acting session is elevated
- reason supplied

### Inputs

- device_id
- reason

### What is created

None.

### What is modified

- device.trust_status
- all sessions on this device revoked with reason=device_untrusted

### What events fire

- device.blocked
- session.revoked

### Who is notified

- **to**: principals holding an active session on that device; **channel**: push_and_email; **when**: always; **template**: device_blocked; **mandatory_operational**: True

### Can it be undone

Yes.

### Concurrency behaviour

Block wins every race against trust_device and untrust_device regardless of ordering, enforced by a conditional write rather than by last-write-wins.

### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | reason empty | Give a reason. It is recorded. | False |  |
| `E_AUTHN` | 401 | not elevated | Confirm your identity to continue. | False |  |
| `E_PRECONDITION` | 409 | device is the last device with an active session for a surface that cannot be re-provisioned remotely | Blocking this leaves no way to operate this surface until a new device is provisioned on site. | False | a warning that must be acknowledged, not a refusal; the administrator may well be blocking it precisely because it was stolen |

## 3. Edge cases

**EC-01.** A blocked device that is offline keeps working until it reaches the server. This is unavoidable in an offline-first system and is stated in the security model rather than hidden. Mitigation: offline_grace_hours caps the window, and financial actions are never permitted offline. The block confirmation states the worst-case exposure window in hours so the administrator can decide whether to also suspend the principals.

**EC-02.** {'Blocking a device with an unsynced mutation queue. The queue is not discarded. If the device ever reconnects it may upload the queue, and every uploaded mutation is tagged uploaded_after_device_block for review rather than being silently accepted or silently dropped. Both silent options are wrong': "silent acceptance launders a stolen device's writes, silent dropping destroys a day of a worker's legitimate work."}

**EC-03.** Blocking a shared device that is a bound KDS or POS terminal ends the station's operation. The action names the station and the count of in-flight work before proceeding.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_identity_session/device/block_device.md`.
