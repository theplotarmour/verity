---
doc_id: ACT-CORE_AUTHORIZATION-START_IMPERSONATION
title: Action — Act as another principal
generated: true
source_model: _model/capabilities/core_authorization.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Act as another principal

*This document is generated. Edit `_model/capabilities/core_authorization.yaml`, not this file.*

**Entity:** `role_binding` · **Capability:** `core_authorization`

**Why this exists:** Support cannot resolve "the button is greyed out for me" without seeing what the user sees. Impersonation is the alternative to asking a customer for their password, which is what happens when the platform does not provide it.


## 1. Specification

### Who can perform it

- platform_operator
- platform_support

### Preconditions

- A ticket reference is supplied.
- Tenant admin consent is recorded, or a contract clause permitting support access is in force for this tenant.
- The session is time-boxed to impersonation_max_minutes.
- The acting operator's own session is elevated.

### Inputs

- target_principal_id
- tenant_id
- ticket_reference
- justification
- requested_minutes

### What is created

- impersonation_session

### What is modified

None.

### What events fire

- impersonation.started

### Who is notified

- **to**: tenant_admin; **channel**: email_and_in_app; **when**: always; **template**: support_access_started; **must_include**: ['operator_display_name', 'ticket_reference', 'target_display_name', 'window']; **mandatory_legal**: True
- **to**: target_principal; **channel**: in_app; **when**: tenant policy notify_impersonated_user is true, which is the shipped default; **template**: support_acting_as_you

### Can it be undone

Yes.

### Concurrency behaviour

One live impersonation per operator at a time. A second request ends the first with reason=superseded rather than running two, because an operator acting as two people simultaneously makes the audit unreadable.

### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | no consent and no contract clause | This workspace has not permitted support access. | False | consent is per tenant and time-boxed, and expires; a permanent consent is not offered |
| `E_VALIDATION` | 422 | ticket reference missing or malformed | A ticket reference is required. | False |  |
| `E_PRECONDITION` | 409 | target principal holds tenant_owner and the operator is platform_support rather than platform_operator | This action is not available in the current state. | False | impersonating an owner is restricted to the higher archetype because an owner sees everything |
| `E_AUTHN` | 401 | operator session not elevated | Confirm your identity to continue. | False |  |
| `E_RATE_LIMIT` | 429 | more than impersonation_daily_limit sessions per operator per day | Too many attempts. Try again shortly. | True | a limit that is generous for genuine support work and tight enough that bulk browsing is visible |

## 3. Edge cases

**EC-01.** Permissions under impersonation are the INTERSECTION of the target's permissions and the operator's own impersonation profile. platform_support carries a redaction of every field marked financial, so support sees the layout and the workflow without seeing the numbers. This is why impersonation is modelled here rather than in the identity capability - it is a permission construct.

**EC-02.** Every mutating action performed under impersonation is written to the audit with both principal ids and the ticket reference, and is additionally rendered in the tenant's own audit view with an unmistakable marker. A support action a customer cannot see in their own audit trail is indistinguishable from an intrusion.

**EC-03.** Elevation is unavailable under impersonation, because elevation requires a credential the operator does not hold. High-risk actions are therefore structurally impossible during support access rather than merely forbidden by a rule that could be misconfigured.

**EC-04.** The impersonation window lapses mid-action. The action in flight completes and the session then ends; there is no partial write. The operator is returned to their own console with a summary of what they did.

**EC-05.** The target principal is suspended during the impersonation. The impersonation ends immediately, because impersonating a principal who cannot themselves act would grant the operator authority the target does not have.

**EC-06.** Impersonation is never available for an integration_principal. There is no user experience to reproduce, so the only reason to impersonate a service account is to use its credentials, which is exactly what must not happen.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_authorization/role_binding/start_impersonation.md`.
