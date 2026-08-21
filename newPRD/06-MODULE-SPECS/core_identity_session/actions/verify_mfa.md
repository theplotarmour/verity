---
doc_id: ACT-CORE_IDENTITY_SESSION-VERIFY_MFA
title: Action — Complete MFA challenge
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Complete MFA challenge

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

**Entity:** `session` · **Capability:** `core_identity_session`

## 1. Specification

### Who can perform it

- principal_with_valid_mfa_challenge

### Preconditions

- An unexpired, unburned mfa_challenge exists for this principal and this device.
- The principal is still status=active and the tenant is still not suspended. Both are re-checked, because either can change between password success and MFA success.

### Inputs

- mfa_challenge_token
- code
- device_fingerprint

### What is created

- session

### What is modified

- principal.last_authenticated_at
- mfa_challenge.burned
- used_code_cache

### What events fire

- session.created
- mfa.verified

### Who is notified

- **to**: principal; **channel**: all_enrolled; **when**: recovery_code_used; **template**: recovery_code_consumed; **must_include**: ['remaining_recovery_codes']; **mandatory_operational**: True

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

The used-code cache is per principal and is checked and written atomically, so two concurrent submissions of the same TOTP value cannot both succeed. That is what makes a shoulder-surfed code useless rather than merely unlucky.


### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_AUTHN` | 401 | wrong TOTP | That code is incorrect. | False | allow +/- 1 time step for clock drift, no more |
| `E_CONFLICT_UNIQUE` | 409 | TOTP code replay | That code has already been used. | False | used codes cached for 90s per principal |
| `E_RATE_LIMIT` | 429 | 5 failed MFA attempts | Too many attempts. | True | challenge burned, must restart sign-in |

## 3. Edge cases

**EC-01.** Recovery code used -> valid once, consumed, principal is told how many remain, and an alert is sent on all channels.

**EC-02.** MFA device lost -> recovery is an administrative action by tenant_admin with a mandatory reason, NOT a self-service email link, because email is often shared in small Indian firms.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_identity_session/session/verify_mfa.md`.
