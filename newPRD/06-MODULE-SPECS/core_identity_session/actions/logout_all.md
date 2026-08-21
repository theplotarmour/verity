---
doc_id: ACT-CORE_IDENTITY_SESSION-LOGOUT_ALL
title: Action — Log out of all devices
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Log out of all devices

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

**Entity:** `session` · **Capability:** `core_identity_session`

## 1. Specification

### Who can perform it

- session_holder
- tenant_admin_for_other_principal
- platform_operator

### Preconditions

- session.elevated_until > now when performed against another principal

### Inputs

- target_principal_id
- preserve_acting_session
- reason

### What is created

None.

### What is modified

- all sessions for principal set revoked_at
- reason=user_logout_all or admin_revoke

### What events fire

- session.revoked (one per session)
- principal.all_sessions_revoked

### Who is notified

- **to**: principal; **channel**: email_and_whatsapp; **when**: performed_by_someone_else; **template**: sessions_revoked_by_admin; **must_include**: ['actor_display_name', 'reason', 'timestamp']

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

The sweep takes a per-principal advisory lock. A session minted DURING the sweep by a race is revoked by a second pass; the sweep runs twice and asserts a zero delta on the second pass, because a revoke-all that leaves one session alive is worse than a slow revoke-all.

### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_AUTHN` | 401 | acting session not elevated when targeting another principal | Confirm your identity to continue. | False |  |
| `E_AUTHZ_SCOPE` | 404 | target principal is outside the acting principal's tenant | Not found. | False |  |
| `E_PRECONDITION` | 409 | target is an integration_principal | This action is not available in the current state. | False | service-account sessions are revoked by revoke_api_key. Conflating the two would let a routine human logout_all silently kill a nightly integration |
| `E_DEPENDENCY` | 424 | the push provider is unavailable for token de-registration | *(silent)* | True | revocation still commits and de-registration is queued and retried. A session must never survive because a notification provider was down |

## 3. Edge cases

**EC-01.** The acting session may optionally be preserved ("log out everywhere else"). Default for self-service is to preserve the current session; default for admin action is to revoke everything including any admin-held impersonation session.

**EC-02.** Service-account sessions are NOT revoked by a human logout_all; they are separate principals. Revoking them is revoke_api_key.

**EC-03.** {'A revoked session on an offline device keeps working until the device next reaches the server. This is unavoidable and must be stated in the security model, not hidden. Mitigation': 'offline token TTL is capped at tenant policy offline_grace_hours (default 12, max 72) and financial actions are never permitted offline.'}

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_identity_session/session/logout_all.md`.
