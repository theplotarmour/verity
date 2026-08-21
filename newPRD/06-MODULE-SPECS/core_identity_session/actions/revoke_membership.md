---
doc_id: ACT-CORE_IDENTITY_SESSION-REVOKE_MEMBERSHIP
title: Action — Remove a person from the workspace
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Remove a person from the workspace

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

**Entity:** `tenant_membership` · **Capability:** `core_identity_session`

## 1. Specification

### Who can perform it

- tenant_admin
- tenant_owner

### Preconditions

- Acting session is elevated.
- Target is not the last active principal holding tenant_owner archetype.

### Inputs

- membership_id
- reason

### What is created

None.

### What is modified

- tenant_membership.status=revoked
- all sessions for that principal in that tenant revoked with reason=membership_revoked

### What events fire

- membership.revoked
- session.revoked

### Who is notified

- **to**: target_principal; **channel**: email_and_whatsapp; **when**: always; **template**: workspace_access_removed; **must_include**: ['tenant_label', 'actor_display_name', 'timestamp']; **mandatory_operational**: True
- **to**: dispatcher_and_supervisor; **channel**: in_app; **when**: the principal has future assignments; **template**: assignee_unavailable

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

Last-owner protection is evaluated inside the same transaction as the write, under a SELECT ... FOR UPDATE over the tenant's owner memberships. Evaluating it outside the transaction permits two concurrent revocations to each observe two owners and leave the tenant with none — the classic write-skew, and the reason this guard is a database concern rather than an application check.

### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | target is the last active tenant_owner | This is the only owner of this workspace. Transfer ownership first. | False |  |
| `E_VALIDATION` | 422 | reason empty | Give a reason. It is recorded and shown to the person. | False |  |
| `E_AUTHN` | 401 | session not elevated | Confirm your identity to continue. | False |  |
| `E_AUTHZ_SCOPE` | 404 | the membership belongs to another tenant | Not found. | False |  |

## 3. Edge cases

**EC-01.** LAST OWNER PROTECTION: refuse with E_PRECONDITION and name the constraint. Ownership transfer is a distinct action requiring the incoming owner to accept.

**EC-02.** Revoking a membership does NOT delete the persons operational history. Work orders they completed, attendance they recorded and invoices they raised remain, attributed to the now-revoked principal, displayed with a 'no longer active' marker.

**EC-03.** In-flight approvals assigned to the revoked principal are reassigned per the tenants approval_fallback policy (escalate to their manager by default) and never silently stall.

**EC-04.** Their shifts in the future roster are flagged as unstaffed and the dispatcher is notified. Verity never silently leaves a site unmanned.

**EC-05.** External client contacts: revoking access must not cancel their open tickets.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_identity_session/tenant_membership/revoke_membership.md`.
