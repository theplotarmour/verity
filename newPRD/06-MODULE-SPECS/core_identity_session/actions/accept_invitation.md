---
doc_id: ACT-CORE_IDENTITY_SESSION-ACCEPT_INVITATION
title: Action — Accept an invitation
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Accept an invitation

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

**Entity:** `principal` · **Capability:** `core_identity_session`

## 1. Specification

### Who can perform it

- any_unauthenticated_holding_a_valid_token

### Preconditions

- Invitation token exists, is unexpired and unburned.
- Tenant is not suspended.

### Inputs

- invitation_token
- credential_choice
- credential_material
- device_fingerprint

### What is created

- credential
- session
- device_if_new

### What is modified

- principal.status
- tenant_membership.status
- tenant_membership.joined_at
- invitation_token.burned

### What events fire

- principal.activated
- membership.accepted
- session.created

### Who is notified

- **to**: inviting_principal; **channel**: in_app; **when**: always; **template**: invitation_accepted; **batching_policy**: one digest per batch of invitations

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

The token is burned with a conditional update (WHERE burned_at IS NULL). The loser of the race receives the winner's session if the device fingerprint matches, and E_PRECONDITION otherwise, because a token accepted from two different devices is a leaked token and must not silently succeed twice.

### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | token expired | This invitation has expired. Ask for a new one. | False | the message deliberately does not say which workspace, because an expired-token page is unauthenticated |
| `E_PRECONDITION` | 409 | token already used | This invitation has already been used. | False |  |
| `E_VALIDATION` | 422 | credential does not meet the tenant password policy | field-specific | False |  |
| `E_TENANT_SUSPENDED` | 423 | tenant suspended between invite and accept | This workspace is suspended. | False |  |
| `E_RATE_LIMIT` | 429 | token guessing, 10 attempts per source IP per hour | Too many attempts. | True |  |

## 3. Edge cases

**EC-01.** Invitation accepted after the inviting tenant revoked the membership. Refused with E_PRECONDITION. The membership row, not the token, is the authority.

**EC-02.** A principal already active in another tenant accepts. No credential is set — they already have one. The flow is a consent screen naming the tenant, then the membership activates. Setting a second credential per tenant is explicitly not supported; identity is platform-level, membership is tenant-level.

**EC-03.** Acceptance from a device already blocked in that tenant. Refused with E_PRECONDITION, and the tenant_admin is notified, because an invitation being accepted on a blocked device is a signal worth surfacing.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_identity_session/principal/accept_invitation.md`.
