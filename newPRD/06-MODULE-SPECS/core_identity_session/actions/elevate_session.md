---
doc_id: ACT-CORE_IDENTITY_SESSION-ELEVATE_SESSION
title: Action — Step-up re-authentication
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Step-up re-authentication

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

**Entity:** `session` · **Capability:** `core_identity_session`

**Why this exists:** High-risk actions must not ride on a 12-hour-old session.

## 1. Specification

### Who can perform it

- session_holder

### Preconditions

- session is valid and not revoked
- the principal holds a re-authenticatable credential
- the session is not an impersonation session

### Inputs

- session_token
- credential_material_or_totp
- requested_action_key

### What is created

- elevation_challenge_record

### What is modified

- session.elevated_until

### What events fire

- session.elevated

### Who is notified

None.

### Can it be undone

Yes.

### Concurrency behaviour

Two concurrent elevations on one session converge because elevated_until is set, not incremented. Elevation is per session, never per principal, so elevating on a desktop does not silently elevate a phone that is signed in as the same person.

### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_AUTHN` | 401 | re-authentication credential wrong | That is not correct. | False | the session is NOT revoked on a failed elevation; the user keeps their normal-privilege session, because otherwise a shoulder-surfer could log a user out by failing an elevation |
| `E_RATE_LIMIT` | 429 | 5 failed elevations in 15 min | Too many attempts. Try again shortly. | True | the underlying session survives; only elevation is barred |
| `E_PRECONDITION` | 409 | session already revoked | Session expired. Sign in again. | False |  |

## 3. Edge cases

**EC-01.** Elevation does not survive switch_tenant. A new session starts unelevated, because the risk of the elevated action is evaluated per tenant.

**EC-02.** An impersonating platform operator can never elevate on behalf of the impersonated principal. Elevation requires a credential and the operator does not hold the subject's credential. High-risk actions are therefore unavailable under impersonation by construction rather than by a permission rule that could be misconfigured.

**EC-03.** A geo-velocity step-down (see refresh_session) clears elevated_until immediately; it does not wait for the window to lapse.

## 5. Required for

- Changing another principal's permissions
- Viewing or editing salary fields
- Approving payment runs
- Exporting any dataset containing sensitive fields
- Deploying a pack or module version to production
- Revoking another principals sessions
- Generating an API key

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_identity_session/session/elevate_session.md`.
