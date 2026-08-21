---
doc_id: ACT-CORE_IDENTITY_SESSION-UNLOCK_PRINCIPAL_MANUAL
title: Action — Unlock an account before the lockout lapses
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Unlock an account before the lockout lapses

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

**Entity:** `principal` · **Capability:** `core_identity_session`

## 1. Specification

### Who can perform it

- tenant_admin
- tenant_owner
- platform_support

### Preconditions

- acting session is elevated
- principal.status = locked
- reason supplied

### Inputs

- principal_id
- reason

### What is created

None.

### What is modified

- principal.locked_until
- principal.failed_auth_count

### What events fire

- principal.unlocked

### Who is notified

- **to**: principal; **channel**: email_or_whatsapp; **when**: always; **template**: account_unlocked; **mandatory_operational**: True

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

Conditional write on locked_until IS NOT NULL. An unlock racing the scheduled auto-unlock is harmless, since both produce the same end state, and the audit records whichever landed first, which is the honest answer to who unlocked it.

### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | principal is not locked | This account is not locked. | False |  |
| `E_AUTHN` | 401 | not elevated | Confirm your identity to continue. | False |  |
| `E_RATE_LIMIT` | 429 | the same principal unlocked more than repeat_lockout_threshold times in 24h | This account keeps locking. Check for a device with a saved wrong password before unlocking again. | True | the limit is advisory and overridable by tenant_owner, because an operations manager at 6am must not be blocked by a rate limit from restoring a shift |

## 3. Edge cases

**EC-01.** Unlocking does not reset MFA or clear a suspension. Those are distinct states and distinct actions. An administrator who expects unlock to fix everything is shown which other conditions still block sign-in.

**EC-02.** Platform_support may unlock but may not suspend, deactivate or change credentials. Read-biased support with exactly one write is deliberate; it is the single most requested support action and routing it through a tenant administrator at 3am is how support tickets become outages.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_identity_session/principal/unlock_principal_manual.md`.
