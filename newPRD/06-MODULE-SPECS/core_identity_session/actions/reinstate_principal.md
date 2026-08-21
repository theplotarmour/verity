---
doc_id: ACT-CORE_IDENTITY_SESSION-REINSTATE_PRINCIPAL
title: Action — Reinstate a suspended person
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Reinstate a suspended person

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

**Entity:** `principal` · **Capability:** `core_identity_session`

## 1. Specification

### Who can perform it

- tenant_admin
- tenant_owner
- platform_operator

### Preconditions

- acting session is elevated
- principal.status = suspended
- reason supplied

### Inputs

- principal_id
- reason
- expected_version

### What is created

None.

### What is modified

- principal.status

### What events fire

- principal.reinstated

### Who is notified

- **to**: principal; **channel**: email_and_whatsapp; **when**: always; **template**: access_restored; **mandatory_operational**: True

### Can it be undone

Yes.

### Concurrency behaviour

Optimistic on expected_version. A reinstatement racing a deactivation loses. Deactivation wins, because the safe resolution of a race between restoring access and removing it is removing it.

### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | principal is deactivated, not suspended | This account is closed and cannot be reopened. | False | deactivation is deliberately not reversible here; see open_questions on rehire |
| `E_AUTHN` | 401 | not elevated | Confirm your identity to continue. | False |  |
| `E_QUOTA` | 402 | seat quota was consumed while the person was suspended | Plan limit reached. | False | this is why suspended memberships count against the quota — so reinstatement can never fail for a reason the administrator could not see coming |

## 3. Edge cases

**EC-01.** No sessions are restored. Reinstatement grants the right to authenticate, not a live session, and the revoked rows stay revoked.

**EC-02.** Reinstating a principal whose tenant_membership was separately revoked leaves them with no landing place. The action succeeds and warns explicitly, naming the memberships that would also need restoring, rather than silently producing an account that can sign in and see nothing.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_identity_session/principal/reinstate_principal.md`.
