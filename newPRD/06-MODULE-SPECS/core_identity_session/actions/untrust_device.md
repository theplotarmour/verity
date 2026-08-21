---
doc_id: ACT-CORE_IDENTITY_SESSION-UNTRUST_DEVICE
title: Action — Withdraw trust from a device
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Withdraw trust from a device

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

**Entity:** `device` · **Capability:** `core_identity_session`

## 1. Specification

### Who can perform it

- tenant_admin
- tenant_owner
- system_scheduler

### Preconditions

- device.trust_status = trusted

### Inputs

- device_id
- reason
- expected_version

### What is created

None.

### What is modified

- device.trust_status

### What events fire

- device.untrusted

### Who is notified

None.

### Can it be undone

Yes.

### Concurrency behaviour

Loses to a concurrent block and wins over a concurrent trust. Trust changes always resolve toward the more restrictive outcome.

### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | device is not trusted | This device is not trusted. | False |  |
| `E_CONFLICT_VERSION` | 409 | concurrent trust change | Someone else changed this record. | True |  |

## 3. Edge cases

**EC-01.** Existing sessions are NOT revoked. They are re-evaluated against the untrusted idle TTL at their next refresh, which may expire them within minutes. Revoking immediately would end a shift mid-task for a policy change that is usually routine hygiene.

**EC-02.** Automatic decay (device_trust_decay_days) uses this same action with actor=system_scheduler so that the audit trail is identical in shape to a human withdrawal and can be queried the same way.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_identity_session/device/untrust_device.md`.
