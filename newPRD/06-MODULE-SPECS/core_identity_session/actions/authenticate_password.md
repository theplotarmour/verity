---
doc_id: ACT-CORE_IDENTITY_SESSION-AUTHENTICATE_PASSWORD
title: Action — Sign in with email and password
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Sign in with email and password

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

**Entity:** `session` · **Capability:** `core_identity_session`

## 1. Specification

### Who can perform it

- any_unauthenticated

### Preconditions

- Principal exists and status IN (active, invited).
- Principal is not locked (locked_until is null or in the past).
- Device is not trust_status=blocked.
- Tenant is not suspended, OR the principal holds a platform archetype.

### Inputs

- email
- password
- device_fingerprint
- surface
- tenant_hint_optional

### What is created

- session
- device_if_new
- auth_attempt_record

### What is modified

- principal.failed_auth_count
- principal.last_authenticated_at
- device.last_seen_at

### What events fire

- session.created
- principal.authenticated

### Who is notified

- **to**: principal; **channel**: email_or_whatsapp; **when**: new_device_or_new_geo; **template**: new_signin_alert

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

Two simultaneous sign-ins from different devices both succeed and create independent sessions. There is no global single-session constraint by default; a tenant policy may set max_concurrent_sessions_per_principal, in which case the OLDEST session is revoked with reason=admin_revoke and the user is told on the surviving device.


### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | malformed email | Enter a valid email address. | False |  |
| `E_AUTHN` | 401 | wrong password OR unknown email | Email or password is incorrect. | False | identical message and identical response timing for both cases, constant-time compare, to prevent account enumeration |
| `E_AUTHN` | 401 | principal.status=suspended | This account is suspended. Contact your administrator. | False |  |
| `E_AUTHN` | 401 | principal.status=deactivated | Email or password is incorrect. | False | deliberately indistinguishable from unknown account |
| `E_RATE_LIMIT` | 429 | 5 failures in 15 min per principal | Too many attempts. Try again in 15 minutes. | True | lock is per principal AND separately per source IP, so an attacker cannot lock a victim out cheaply — IP limit is 20/15min |
| `E_TENANT_SUSPENDED` | 423 | tenant billing suspension | This workspace is suspended. | False |  |
| `E_PRECONDITION` | 409 | device blocked | This device is not permitted. Contact your administrator. | False |  |

## 3. Edge cases

**EC-01.** Correct password but MFA enrolled -> session is NOT created. A short-lived mfa_challenge token is returned instead. The session row is created only after MFA success.

**EC-02.** Principal has zero active tenant memberships -> authentication succeeds, no session is minted, user lands on a "no workspaces" screen with a support link. This is not an error state.

**EC-03.** Principal has multiple active memberships and no tenant_hint -> tenant picker. Session minted only after choice.

**EC-04.** Password correct but expired per tenant password_max_age policy -> forced change flow, session minted only after change, all other sessions revoked with reason=password_change.

**EC-05.** Clock skew on the device does not affect expiry; expiry is evaluated server-side only.

**EC-06.** Sign-in during an in-progress offline sync on the same device by a DIFFERENT principal -> blocked with E_PRECONDITION until the queue drains or the outgoing user explicitly discards, because queued mutations are attributed to the queueing principal and must not be replayed under a new identity.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_identity_session/session/authenticate_password.md`.
