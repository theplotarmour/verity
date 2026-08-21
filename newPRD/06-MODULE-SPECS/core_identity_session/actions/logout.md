---
doc_id: ACT-CORE_IDENTITY_SESSION-LOGOUT
title: Action — Log out (this device)
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Log out (this device)

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

**Entity:** `session` · **Capability:** `core_identity_session`

## 1. Specification

### Who can perform it

- session_holder

### Preconditions

- session exists and is not already revoked

### Inputs

- session_token
- offline_queue_disposition

### What is created

None.

### What is modified

- session.revoked_at
- session.revocation_reason=user_logout

### What events fire

- session.revoked

### Who is notified

None.

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

Revocation is a conditional write on revoked_at IS NULL, so a logout racing a reap or an administrative revoke leaves the FIRST reason in place. The reason matters more than the timestamp, because support reading user_logout and support reading admin_revoke take different actions.


### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_DEPENDENCY` | 424 | network unavailable at logout | *(silent)* | True | see offline edge case, this is NOT surfaced as a failure |

## 3. Edge cases

**EC-01.** OFFLINE LOGOUT: user taps Log out with no connectivity and a non-empty mutation queue. Do NOT silently discard. Present three options: (a) Stay signed in until synced — recommended, default; (b) Log out and keep queued work on this device for this user to sync later — allowed only on non-shared devices, queue stays encrypted at rest keyed to the principal; (c) Log out and discard N unsynced changes — requires typing the count to confirm, emits a client_side_discard telemetry event, and is refused entirely if any queued mutation is financial or attendance-related.

**EC-02.** SHARED DEVICE LOGOUT: on device.shared=true, logout also clears the fast-switch PIN cache and returns to the roster picker, not to the marketing login screen.

**EC-03.** FIXED-STATION LOGOUT: a station display bound to a site does not truly log out to an anonymous state — it returns to a station picker while retaining the device-level station credential. A human logging out of one must not orphan the work in progress on it; that work is already server-side, so this is safe, but the client must confirm 'N items in progress remain on the server' rather than showing an empty screen.

**EC-04.** LOGOUT DURING AN IN-FLIGHT MUTATION: the mutation is allowed to complete server-side; the session is revoked at the transaction boundary, not mid-transaction. The result is written to the audit log with the pre-revocation session id.

**EC-05.** LOGOUT WHILE IMPERSONATED: if impersonated_by_principal_id is set, 'log out' ends the impersonation and returns the operator to their own HQ session; it does not log out the impersonated users real sessions.

**EC-06.** DOUBLE LOGOUT / already-revoked session: idempotent. Returns 2xx. Never an error.

**EC-07.** Logout does not revoke other sessions. That is logout_all.

## 4. Client obligations

- Server revokes first, client clears local state only after a 2xx OR after a 401/404 (both mean the session is gone).
- {'On success the client must purge': 'access token, refresh token, cached permission set, cached tenant config, cached user profile, in-memory PII, service worker caches keyed to the session, and IndexedDB stores marked session_scoped.'}
- The client must NOT purge stores marked device_scoped (offline mutation queue, downloaded shift roster) until the queue is confirmed empty. See edge cases.
- Push notification token is de-registered for this principal on this device before local purge.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_identity_session/session/logout.md`.
