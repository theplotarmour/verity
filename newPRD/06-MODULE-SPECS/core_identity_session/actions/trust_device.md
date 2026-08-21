---
doc_id: ACT-CORE_IDENTITY_SESSION-TRUST_DEVICE
title: Action — Trust this device
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Trust this device

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

**Entity:** `device` · **Capability:** `core_identity_session`

**Why this exists:** Trust is what buys a device a longer idle timeout and, where policy allows, a shared-device fast-switch PIN. It is a grant, not an observation.

## 1. Specification

### Who can perform it

- tenant_admin
- tenant_owner

### Preconditions

- acting session is elevated
- device.min_supported_version_ok is true
- device.trust_status = untrusted

### Inputs

- device_id
- label
- bound_site_id_optional
- expected_version

### What is created

None.

### What is modified

- device.trust_status

### What events fire

- device.trusted

### Who is notified

None.

### Can it be undone

Yes.

### Concurrency behaviour

Optimistic on expected_version. A trust grant racing a block loses; block always wins, because the safe resolution of a race between a grant and a revocation is the revocation.

### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | device below minimum supported app version | Update the app on this device before trusting it. | False |  |
| `E_PRECONDITION` | 409 | device is blocked | Unblock this device first. | False | blocked goes to untrusted, never straight to trusted |
| `E_VALIDATION` | 422 | label empty or duplicated within the tenant | Give this device a name that is unique in this workspace. | False | duplicate device labels make a revocation list unusable at 3am, which is exactly when it is read |
| `E_AUTHN` | 401 | not elevated | Confirm your identity to continue. | False |  |

## 3. Edge cases

**EC-01.** Trusting a device does not trust the people who use it. A shared device carries no principal authority; every session on it still authenticates a principal.

**EC-02.** Trusting a device that is bound to a site restricts sessions on it to that site. Attempting a session for another site on that device fails with E_AUTHZ_SCOPE (404), not a message naming the bound site, because the bound site may itself be information the signing-in person should not have.

**EC-03.** A device fingerprint can change under the platform's control (OS reinstall, app data clear). This mints a NEW device row in untrusted rather than silently re-associating, and the old row goes stale and surfaces in the untrusted stuck-state list. Silent re-association would make the fingerprint worthless as a control.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_identity_session/device/trust_device.md`.
