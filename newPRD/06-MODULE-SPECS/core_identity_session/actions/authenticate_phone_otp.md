---
doc_id: ACT-CORE_IDENTITY_SESSION-AUTHENTICATE_PHONE_OTP
title: Action — Sign in with phone and OTP
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Sign in with phone and OTP

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

**Entity:** `session` · **Capability:** `core_identity_session`

**Why this exists:** Primary path for the large share of the target workforce who hold a phone and no work email address.

## 1. Specification

### Who can perform it

- any_unauthenticated

### Preconditions

- Principal with matching primary_phone_e164 exists and status IN (active, invited).
- OTP send is DLT-compliant (registered template, registered header).

### Inputs

- phone_e164
- otp_code
- device_fingerprint
- surface

### What is created

- session
- device_if_new
- auth_attempt_record

### What is modified

- principal.failed_auth_count
- principal.last_authenticated_at
- device.last_seen_at
- otp_challenge.burned

### What events fire

- session.created
- principal.authenticated

### Who is notified

- **to**: principal; **channel**: whatsapp_or_sms; **when**: new_device_or_new_geo; **template**: new_signin_alert; **cost_class**: utility

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

Two devices verifying the same OTP concurrently - which happens whenever a code is read aloud in a shared workspace - resolve by burning the challenge under a conditional update. The loser receives the winner's session only if the device fingerprint matches, and E_AUTHN otherwise. A code that succeeded on two different devices is a shared code and must not silently mint two sessions.


### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_AUTHN` | 401 | wrong OTP | That code is incorrect. | False | max 5 verify attempts per OTP, then OTP is burned |
| `E_AUTHN` | 401 | expired OTP | That code has expired. Request a new one. | False | OTP TTL 5 minutes |
| `E_RATE_LIMIT` | 429 | OTP resend abuse | Wait before requesting another code. | True | 3 sends per phone per 15 min, exponential backoff 30s/60s/300s |
| `E_DEPENDENCY` | 424 | SMS gateway down | We could not send the code. Try WhatsApp instead. | True | automatic channel fallback SMS -> WhatsApp authentication template |

## 3. Edge cases

**EC-01.** Same phone number reused after an employee leaves and a new employee gets the recycled SIM -> phone is NOT an identity. On employee deactivation the phone is released from the principal after a tenant-configured cooling period (default 30 days) and re-registration requires supervisor confirmation.

**EC-02.** OTP delivered but user is offline -> OTP verification requires connectivity. There is no offline first-login. Devices are provisioned online, then may go offline.

**EC-03.** Two principals in different tenants share one phone number (a supervisor who moonlights) -> permitted; after OTP success the tenant picker appears.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_identity_session/session/authenticate_phone_otp.md`.
