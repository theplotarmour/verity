---
doc_id: ACT-CORE_IDENTITY_SESSION-INVITE_PRINCIPAL
title: Action — Invite someone to the workspace
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Invite someone to the workspace

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

**Entity:** `tenant_membership` · **Capability:** `core_identity_session`

**Why this exists:** Onboarding is where a platform is won or lost. Bulk onboarding of a field workforce that has phone numbers but no email addresses is the normal case, not the exception, so the invitation path must not assume a mailbox.


## 1. Specification

### Who can perform it

- tenant_admin
- tenant_owner

### Preconditions

- Acting principal holds create on tenant_membership at tenant scope.
- Tenant is not suspended and is below its seat quota, if a quota is configured.
- The invitee identifier is a valid e164 phone or a valid email.

### Inputs

- identifier
- identifier_kind
- display_name
- role_ids
- assignable_scope_bindings
- default_landing_surface
- invitation_channel

### What is created

- principal_if_no_platform_match
- tenant_membership
- invitation_token
- auth_attempt_record

### What is modified

None.

### What events fire

- membership.invited

### Who is notified

- **to**: invitee; **channel**: invitation_channel; **when**: immediately; **template**: workspace_invitation; **cost_class**: utility
- **to**: inviting_principal; **channel**: in_app; **when**: on_bulk_completion; **template**: invitation_batch_summary; **batching_policy**: one message per batch, never one per invitee

### Can it be undone

Yes.

### Concurrency behaviour

Two administrators inviting the same identifier concurrently: unique(principal_id, tenant_id) on tenant_membership makes one lose with E_CONFLICT_UNIQUE, which the API converts to the idempotent 200 above. The platform-level principal row is created under a unique index on the normalised identifier, so the two requests cannot mint two principals for one phone number.


### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | identifier is neither a valid e164 phone nor a valid email | Enter a mobile number with country code, or an email address. | False |  |
| `E_CONFLICT_UNIQUE` | 409 | an ACTIVE membership already exists for this identifier in this tenant | This person is already in this workspace. | False | distinct from the pending-invitation case, which is idempotent and silent |
| `E_QUOTA` | 402 | seat quota reached | Plan limit reached. | False | the count of consumed seats must state whether suspended memberships are included, because they are — see tenant_membership.suspended stuck policy |
| `E_AUTHZ_FIELD` | 200 | inviter attempts to grant a role carrying archetypes they do not themselves hold | *(silent)* | False | privilege escalation by invitation is the classic path; the role list presented is projected to roles the inviter could grant, and the server re-checks rather than trusting the client's list |
| `E_DEPENDENCY` | 424 | invitation channel provider unavailable | The invitation is created but we could not send it yet. | True | the membership row is committed and the send is queued and retried; a failed send never rolls back an onboarding batch |
| `E_RATE_LIMIT` | 429 | more than invite_burst_limit invitations per tenant per hour (default 500) | Too many invitations at once. | True | protects the shared messaging sender reputation, which is a platform-level asset one tenant can damage for every other tenant |

## 3. Edge cases

**EC-01.** The identifier already exists as a platform principal in another tenant. No new principal is created; a membership is added to the existing principal. The inviter is NOT told that the person exists elsewhere — that would disclose the existence of another tenant's user. The invitee, on accepting, sees a workspace picker rather than a signup form.

**EC-02.** The identifier belongs to a principal in status deactivated. Treated as unknown. A new principal row is created only if the identifier has passed its release cooling period; otherwise the invitation is refused with E_VALIDATION and a message that does not confirm the prior account's existence.

**EC-03.** Bulk invite of 200 rows where 3 are malformed. The 197 valid rows commit and the 3 are returned as a downloadable error file with the original row numbers. Verity never rolls back a whole import for a minority of bad rows, and never silently drops them.

**EC-04.** The inviting principal's own membership is revoked before the invitee accepts. The invitation remains valid; it is a tenant grant, not a personal one. The audit row retains the original inviter.

**EC-05.** Invitation sent to a phone number the invitee shares with a family member on a shared handset. Acceptance requires possession of the OTP AND setting a credential, and the accepted-by device fingerprint is recorded. This is a known and unresolved weakness of phone-as-identity in shared-handset households; see open_questions.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_identity_session/tenant_membership/invite_principal.md`.
