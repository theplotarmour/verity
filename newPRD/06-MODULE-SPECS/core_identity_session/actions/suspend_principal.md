---
doc_id: ACT-CORE_IDENTITY_SESSION-SUSPEND_PRINCIPAL
title: Action — Suspend a person's access
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Suspend a person's access

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

**Entity:** `principal` · **Capability:** `core_identity_session`

**Why this exists:** A reversible stop that preserves history and assignments, for investigations and disputes. Deactivation is the irreversible one.

## 1. Specification

### Who can perform it

- tenant_admin
- tenant_owner
- platform_operator

### Preconditions

- Acting session is elevated.
- Target is not the last active principal holding tenant_owner archetype in this tenant.
- Reason is supplied and non-empty.

### Inputs

- principal_id
- reason
- expected_version

### What is created

None.

### What is modified

- principal.status
- all sessions for this principal revoked with reason=principal_suspended

### What events fire

- principal.suspended
- session.revoked

### Who is notified

- **to**: principal; **channel**: email_and_whatsapp; **when**: always; **template**: access_suspended; **must_include**: ['actor_display_name', 'reason', 'timestamp']; **mandatory_operational**: True
- **to**: dispatcher_and_supervisor_for_their_open_assignments; **channel**: in_app; **when**: the principal has future assignments; **template**: assignee_unavailable

### Can it be undone

Yes.

### Concurrency behaviour

Last-owner protection is evaluated under a row lock over the tenant's owner memberships inside the write transaction. Optimistic version check on expected_version guards against suspending a principal whose status changed under the administrator's stale list view.

### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | target is the last active tenant_owner | This is the only owner of this workspace. Transfer ownership first. | False | the message names the constraint rather than saying access denied, because the administrator has the authority and just needs to do it in the right order |
| `E_VALIDATION` | 422 | reason empty | Give a reason. It is recorded and shown to the person. | False |  |
| `E_AUTHN` | 401 | acting session not elevated | Confirm your identity to continue. | False |  |
| `E_CONFLICT_VERSION` | 409 | principal changed since the list was loaded | Someone else changed this record. | True |  |

## 3. Edge cases

**EC-01.** Suspension does not release the person's future assignments automatically. It flags them and tells the dispatcher, because auto-releasing a week of assignments on a suspension that is reversed the next morning creates more work than it saves. Whether it SHOULD auto-release is a configurable policy — see rules.

**EC-02.** Suspension while the person holds an in-flight approval. The approval is reassigned per approval_fallback. A suspension that silently parks an approval is how a purchase order sits for three weeks.

**EC-03.** Suspending a principal who holds memberships in several tenants. Suspension is platform-level on the principal row and therefore affects every tenant. A tenant_admin may only suspend a principal whose memberships are entirely within their tenant; otherwise they may only suspend_membership. This asymmetry is deliberate and is enforced server-side, because one tenant must never be able to cut off another tenant's staff.

**EC-04.** {'Suspending oneself. Permitted but requires typing the word to confirm, and warns that reinstatement will require another administrator. Forbidding it entirely creates a worse failure': 'a compromised administrator who cannot lock themselves out.'}

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_identity_session/principal/suspend_principal.md`.
