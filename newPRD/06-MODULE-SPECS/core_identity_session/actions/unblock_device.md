---
doc_id: ACT-CORE_IDENTITY_SESSION-UNBLOCK_DEVICE
title: Action — Unblock a device
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Unblock a device

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

**Entity:** `device` · **Capability:** `core_identity_session`

## 1. Specification

### Who can perform it

- tenant_admin
- tenant_owner

### Preconditions

- acting session is elevated
- device.trust_status = blocked
- reason supplied

### Inputs

- device_id
- reason

### What is created

None.

### What is modified

- device.trust_status

### What events fire

- device.unblocked

### Who is notified

- **to**: tenant_admin; **channel**: in_app; **when**: always; **template**: device_unblocked; **must_include**: ['device_label', 'actor_display_name', 'reason']

### Can it be undone

Yes.

### Concurrency behaviour

Conditional on the device still being blocked. An unblock racing a second block loses, per the trust-resolves-restrictive rule.

### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | device is not blocked | This device is not blocked. | False |  |
| `E_AUTHN` | 401 | not elevated | Confirm your identity to continue. | False |  |

## 3. Edge cases

**EC-01.** Unblocking returns the device to untrusted, never to its previous trusted status. Re-granting trust is a separate, separately audited decision.

**EC-02.** Any queued mutations tagged uploaded_after_device_block remain tagged after unblocking. Unblocking a device does not retrospectively bless writes made while it was blocked.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_identity_session/device/unblock_device.md`.
