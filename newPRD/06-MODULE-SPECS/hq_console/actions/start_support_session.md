---
doc_id: ACT-HQ_CONSOLE-START_SUPPORT_SESSION
title: Action — Look at a tenant's workspace
generated: true
source_model: _model/capabilities/hq_console.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Look at a tenant's workspace

*This document is generated. Edit `_model/capabilities/hq_console.yaml`, not this file.*

**Entity:** `tenant` · **Capability:** `hq_console`

**Why this exists:** Support cannot resolve most problems without seeing what the customer sees. This action is the alternative to asking a customer for their password, and every constraint on it exists because the alternative to a controlled mechanism is an uncontrolled one.


## 1. Specification

### Who can perform it

- platform_support
- platform_operator

### Preconditions

- A ticket reference is supplied.
- Consent is in force, or a contract clause permits access.
- The operator's own session is elevated.
- The session is time-boxed.

### Inputs

- tenant_id
- target_principal_id
- ticket_reference
- justification
- requested_minutes

### What is created

- an impersonation grant through the authorization port

### What is modified

None.

### What events fire

- platform.support_session_started

### Who is notified

- **to**: tenant_admin; **channel**: email_and_in_app; **when**: always; **template**: support_access_started; **must_include**: ['operator_name', 'ticket_reference', 'target', 'window']; **mandatory_legal**: True
- **to**: the impersonated principal; **channel**: in_app; **when**: tenant policy notifies them, which is the shipped default; **template**: support_acting_as_you

### Can it be undone

Yes.

### Concurrency behaviour

One live support session per operator, and a second ends the first with reason=superseded. An operator acting as two people simultaneously makes the audit unreadable, which is the whole reason the constraint exists.

### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | no consent in force and no contract clause | This workspace has not permitted support access. | False | consent is time-boxed and expires; there is no permanent value, so this is a condition support will meet regularly and must be able to resolve by asking |
| `E_VALIDATION` | 422 | ticket reference missing | A ticket reference is required. | False |  |
| `E_PRECONDITION` | 409 | the target holds tenant_owner and the operator is platform_support | This action is not available in the current state. | False | impersonating an owner is restricted to the higher archetype because an owner sees everything |
| `E_AUTHN` | 401 | operator session not elevated | Confirm your identity to continue. | False |  |
| `E_RATE_LIMIT` | 429 | more than the daily support session limit | Too many attempts. Try again shortly. | True | generous for genuine support work and tight enough that bulk browsing is visible |

## 3. Edge cases

**EC-01.** Permissions under support access are the INTERSECTION of the target's permissions and the operator's redaction profile. platform_support carries a redaction of every field marked financial, so support sees the layout and the workflow and not the numbers. This is enforced by core_authorization and is restated here because it is the property that makes the whole mechanism acceptable to a customer.

**EC-02.** Every action taken under support access appears in the TENANT's own audit stream with the operator and the ticket reference, not only in the platform's. Support access a customer cannot see in their own trail is indistinguishable from an intrusion, and the audit port contract carries this requirement rather than leaving it to be remembered.

**EC-03.** Elevation is structurally unavailable under support access, because elevation requires a credential the operator does not hold. High-risk actions are therefore impossible during support rather than merely forbidden by a rule somebody could misconfigure.

**EC-04.** Consent withdrawn during a live session. The session ends at the next request boundary rather than mid-action. Whether that is the right boundary is an open question carried from core_authorization and it is the same question, not a second one.

**EC-05.** A support session on a suspended tenant. Permitted, because the most common reason to look at a suspended tenant is to help them resolve the suspension, and refusing would make that impossible.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/hq_console/tenant/start_support_session.md`.
