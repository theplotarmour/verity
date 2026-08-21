---
doc_id: ACT-CORE_IDENTITY_SESSION-DEACTIVATE_PRINCIPAL
title: Action — Close a person's account
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Close a person's account

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

**Entity:** `principal` · **Capability:** `core_identity_session`

## 1. Specification

### Who can perform it

- tenant_admin
- tenant_owner
- platform_operator

### Preconditions

- Acting session is elevated.
- Target is not the last active tenant_owner.
- Confirmation phrase typed.
- Reason supplied.

### Inputs

- principal_id
- reason
- confirmation_phrase
- phone_release_choice

### What is created

- identifier_release_schedule_entry

### What is modified

- principal.status
- principal.deactivated_at
- all memberships revoked
- all sessions revoked
- credentials destroyed

### What events fire

- principal.deactivated
- membership.revoked
- session.revoked

### Who is notified

- **to**: principal; **channel**: email_and_whatsapp; **when**: only if a contactable channel survives deactivation; **template**: account_closed; **mandatory_legal**: True
- **to**: tenant_owner; **channel**: in_app; **when**: target held tenant_admin or finance archetype; **template**: privileged_account_closed

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

Runs as one transaction over principal, memberships and sessions, then a post-commit sweep for sessions minted during the transaction. The sweep asserts zero delta, as in logout_all.

### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | last active tenant_owner | This is the only owner of this workspace. Transfer ownership first. | False |  |
| `E_VALIDATION` | 422 | confirmation phrase mismatch | The name does not match. | False |  |
| `E_PRECONDITION` | 409 | principal holds an integration_principal archetype with live integrations bound to it | This service account is in use by N integrations. Rotate them first. | False | names the integrations; closing a service account silently is how a nightly sync dies without anyone noticing until month end |
| `E_AUTHN` | 401 | not elevated | Confirm your identity to continue. | False |  |

## 3. Edge cases

**EC-01.** Operational history is never deleted. Records the person created remain, attributed to the closed principal and rendered with a no-longer-active marker. This is not a soft delete of their work; it is the correct answer for an audit trail.

**EC-02.** The person's phone number and email are retained on the principal row until the release cooling period lapses (default 30 days, tenant-configurable), then released so a recycled SIM can be onboarded as a new principal. Release is a scheduled job, is audited, and is what prevents the recycled-SIM identity collision described under authenticate_phone_otp.

**EC-03.** A data-subject erasure request against a deactivated principal is a DIFFERENT operation, handled by core_audit's retention and legal-hold machinery, and is constrained by any legal hold. Deactivation is not erasure and the UI must not imply that it is.

**EC-04.** Deactivating a principal who is the sole approver in a live approval chain. Refused unless the approval_fallback policy resolves to a reachable approver; the error names the chains that would stall.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_identity_session/principal/deactivate_principal.md`.
