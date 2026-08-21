---
doc_id: ACT-CORE_IDENTITY_SESSION-REFRESH_SESSION
title: Action — Slide idle expiry
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Slide idle expiry

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

**Entity:** `session` · **Capability:** `core_identity_session`

**Note:** Deliberately does NOT emit an event. Refreshes are high-frequency and would flood the event log. Session activity is observable from device.last_seen_at.


## 1. Specification

### Who can perform it

- session_holder

### Preconditions

- session.revoked_at is null
- now < idle_expiry_at
- now < absolute_expiry_at

### Inputs

- session_token

### What is created

None.

### What is modified

- session.idle_expiry_at
- device.last_seen_at

### What events fire

None.

### Who is notified

None.

### Can it be undone

Yes.

### Concurrency behaviour

idle_expiry_at moves by max(), never by assignment, so concurrent refreshes from a web tab and a background sync converge without a lock and neither can move the expiry backwards.


### Audit class

read_sensitive_only

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_AUTHN` | 401 | session already revoked, or now is past idle_expiry_at | Session expired. Sign in again. | False | the session is marked revoked with reason=idle_timeout on this path rather than waiting for the reaper, so the reason is accurate at the moment it is observed |
| `E_AUTHN` | 401 | now is past absolute_expiry_at | Session expired. Sign in again. | False |  |
| `E_TENANT_SUSPENDED` | 423 | the tenant was suspended after the session was issued | This workspace is suspended. | False | checked on refresh rather than only at sign-in, so a suspension takes effect within one refresh interval rather than within one session lifetime |
| `E_RATE_LIMIT` | 429 | a client refreshing far more often than the idle window requires | *(silent)* | True | silently throttled rather than surfaced. This is a client defect and the person holding the device can do nothing about it |

## 3. Edge cases

**EC-01.** Refresh arriving after idle_expiry_at but before absolute_expiry_at -> E_AUTHN, session revoked with reason=idle_timeout. No silent resurrection.

**EC-02.** {'Refresh from a different IP/geo than issue -> allowed by default (Indian mobile networks change IP constantly) but a geo jump exceeding tenant policy geo_velocity_kmh triggers step-down': 'session survives, elevated_until is cleared, and next high-risk action requires re-auth.'}

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_identity_session/session/refresh_session.md`.
