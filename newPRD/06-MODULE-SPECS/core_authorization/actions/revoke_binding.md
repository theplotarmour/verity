---
doc_id: ACT-CORE_AUTHORIZATION-REVOKE_BINDING
title: Action — Take away a role
generated: true
source_model: _model/capabilities/core_authorization.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Take away a role

*This document is generated. Edit `_model/capabilities/core_authorization.yaml`, not this file.*

**Entity:** `role_binding` · **Capability:** `core_authorization`

## 1. Specification

### Who can perform it

- tenant_admin
- tenant_owner

### Preconditions

- acting session is elevated
- not the last binding conferring tenant_owner in this tenant
- reason supplied

### Inputs

- binding_id
- reason

### What is created

None.

### What is modified

- role_binding.revoked_at
- permission cache invalidated immediately

### What events fire

- binding.revoked

### Who is notified

- **to**: target_principal; **channel**: in_app_and_email_or_whatsapp; **when**: always; **template**: role_revoked; **must_include**: ['role_label', 'actor_display_name', 'reason', 'timestamp']; **mandatory_operational**: True

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

Last-owner protection is evaluated under a row lock over the tenant's owner bindings inside the write transaction, for the same write-skew reason as the identity capability's last-owner rule.

### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | last binding conferring tenant_owner | This is the only owner of this workspace. Transfer ownership first. | False |  |
| `E_VALIDATION` | 422 | reason empty | Give a reason. It is recorded and shown to the person. | False |  |
| `E_AUTHN` | 401 | session not elevated | Confirm your identity to continue. | False |  |

## 3. Edge cases

**EC-01.** Revocation takes effect on the target's next request. Existing sessions are not revoked, because losing a role is not losing identity, and forcing a re-login for a routine permission change trains people to expect random logouts.

**EC-02.** In-flight approvals assigned to the revoked binding are reassigned per the approval_fallback policy and never silently stall. If no fallback resolves, the revocation still succeeds and the stalled approvals are listed to the tenant_admin, because blocking a revocation on a workflow is how a departing employee keeps access.

**EC-03.** Revoking a binding a person is actively using produces a specific message on their next action naming what changed and who changed it, not a generic denial. A permission that vanishes without explanation is indistinguishable from a bug and generates a support ticket every time.

**EC-04.** Revoking the binding of a principal who is currently being impersonated by platform_support. The impersonation session immediately loses the permission too, since impersonation is an intersection and never a union.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_authorization/role_binding/revoke_binding.md`.
