---
doc_id: ACT-INTEGRATIONS-ROTATE_CREDENTIAL
title: Action — Rotate a credential
generated: true
source_model: _model/capabilities/integrations.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Rotate a credential

*This document is generated. Edit `_model/capabilities/integrations.yaml`, not this file.*

**Entity:** `connection` · **Capability:** `integrations`

**Why this exists:** Credential expiry is the single most common cause of an integration that worked for a year and then stopped. Rotation is modelled as a first-class act with an overlap window because the naive implementation - replace and hope - fails in the middle of a delivery.


## 1. Specification

### Who can perform it

- tenant_admin
- tenant_owner
- platform_operator

### Preconditions

- acting session is elevated
- the secret store is available
- the connection is not disabled

### Inputs

- connection_id
- new_credential_material
- overlap_minutes
- reason

### What is created

- a new credential reference in the secret store

### What is modified

- credential_ref
- credential_expires_at

### What events fire

- integration.credential_rotated

### Who is notified

- **to**: the connection owner and tenant_admin; **channel**: in_app; **when**: always; **template**: credential_rotated; **must_include**: ['connection', 'actor', 'new_expiry']

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

The old credential remains valid for the overlap window, so messages already in flight under it complete. The connection row is locked during the swap so two concurrent rotations cannot leave the reference pointing at a revoked secret. Revocation of the old credential is scheduled rather than immediate, and is itself audited.


### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_DEPENDENCY` | 424 | the secret store is unavailable | A required service is unavailable. | True | the rotation is refused and the existing credential remains. A half-completed rotation leaves a connection with a reference to a secret that may not exist |
| `E_AUTHN` | 401 | the new credential fails a test call | *(silent)* | False | the rotation is completed anyway where the operator accepts it explicitly, because some far sides only accept a credential after their own activation step, and refusing would make those integrations unrotatable |
| `E_AUTHN` | 401 | session not elevated | Confirm your identity to continue. | False |  |
| `E_PRECONDITION` | 409 | the connection is disabled | This action is not available in the current state. | False |  |

## 3. Edge cases

**EC-01.** A rotation during active delivery. The overlap window is why in-flight messages do not fail. Without it a rotation drops whatever was mid-request, which for a delivery near its budget expiry means a dead letter caused by the rotation itself.

**EC-02.** A credential that expires with no rotation. The connection degrades and then suspends, messages queue rather than being lost, and the owner has been told at 30, 7 and 1 days. This is entirely preventable and the warning schedule exists because it is the most common failure this capability sees.

**EC-03.** Rotation of a credential the tenant does not control - one issued by the far side. Verity can only store what it is given; the model records the expiry and warns, and the act of obtaining a new one is outside the system. The warning is the whole value.

**EC-04.** A revoked credential still being presented by a far side that cached it. Rejected as an authentication failure and recorded, which is the correct outcome and is worth reporting rather than silently 401-ing, because it means the far side has stale configuration.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/integrations/connection/rotate_credential.md`.
