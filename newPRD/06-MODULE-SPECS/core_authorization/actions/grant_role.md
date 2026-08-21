---
doc_id: ACT-CORE_AUTHORIZATION-GRANT_ROLE
title: Action — Give someone a role
generated: true
source_model: _model/capabilities/core_authorization.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Give someone a role

*This document is generated. Edit `_model/capabilities/core_authorization.yaml`, not this file.*

**Entity:** `role_binding` · **Capability:** `core_authorization`

## 1. Specification

### Who can perform it

- tenant_admin
- tenant_owner

### Preconditions

- Acting session is elevated.
- The acting principal holds every verb the role grants, at a scope at least as wide.
- The target principal has an active membership in this tenant.
- Every scope binding names a value the acting principal can themselves reach.

### Inputs

- principal_id
- role_id
- scope_bindings
- expires_at_optional
- reason

### What is created

- role_binding

### What is modified

- permission cache invalidated for the target principal

### What events fire

- binding.granted

### Who is notified

- **to**: target_principal; **channel**: in_app_and_email_or_whatsapp; **when**: always; **template**: role_granted; **must_include**: ['role_label', 'scope_summary', 'granter_display_name', 'expiry_if_any']; **mandatory_operational**: True
- **to**: tenant_owner; **channel**: in_app; **when**: the role carries tenant_admin, finance or tenant_owner archetype; **template**: privileged_role_granted

### Can it be undone

Yes.

### Concurrency behaviour

Unique index over non-revoked (principal_id, role_id, tenant_id). The merge described above resolves the race deterministically regardless of arrival order because union and max are both commutative.

### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_AUTHZ_SCOPE` | 404 | a named scope value is outside the granter's own scope | Not found. | False | the location the granter cannot reach must not be confirmed to exist. The picker shows only reachable values and the server re-checks |
| `E_VALIDATION` | 422 | scope_bindings empty for a scope kind the role's grants require | Choose at least one location for this role. | False | names the specific scope kind. Granting a role that resolves to nothing is the most common new-administrator mistake and the error must teach rather than reject |
| `E_PRECONDITION` | 409 | target principal has no active membership | This person is not in this workspace. | False |  |
| `E_PRECONDITION` | 409 | role requires MFA and the target principal is not enrolled | This role requires two-factor authentication. Ask them to set it up first. | False | the binding is created in a pending state rather than refused outright only if the tenant policy allows it; the shipped default refuses, because a privileged role held by an unprotected account is the exposure this rule exists to prevent |
| `E_AUTHZ_ENTITY` | 403 | the granter does not hold every verb the role grants | You cannot grant access you do not have. | False |  |
| `E_AUTHN` | 401 | session not elevated | Confirm your identity to continue. | False |  |

## 3. Edge cases

**EC-01.** Granting a role to oneself. Permitted for tenant_owner, refused for everyone else, and always flagged in the audit stream. A tenant_owner who cannot grant themselves a role cannot recover a workspace after an administrator leaves.

**EC-02.** A binding with expires_at set for cover during an absence. At expiry the permission cache is invalidated but live sessions are NOT revoked. The person keeps working and simply cannot perform the covered actions any more, receiving a specific message rather than a generic denial.

**EC-03.** Granting a role whose scope bindings reference locations that are later archived. The binding survives; the archived values resolve to nothing. This is reported in the access review rather than fixed automatically, because automatically widening a scope to compensate is an escalation.

**EC-04.** Two administrators granting different scope values of the same role concurrently. The union merge means both sets apply. This is deliberately permissive - the alternative, last-write-wins, silently discards one administrator's decision.

**EC-05.** Granting a role to an integration_principal. Permitted, but the binding may never carry a scope derived from a human relationship such as own_team, because a service account has no manager and the scope would resolve to the empty set forever. Refused at write time with a message naming the offending scope.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_authorization/role_binding/grant_role.md`.
