---
doc_id: ACT-CORE_IDENTITY_SESSION-REAP_SESSION
title: Action — Reap an expired session
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Reap an expired session

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

**Entity:** `session` · **Capability:** `core_identity_session`

**Why this exists:** Expiry is evaluated server-side on every request, so security does not depend on the reaper. The reaper exists so that the session list an administrator reads is truthful, and so that revocation_reason is written accurately at the moment of expiry rather than inferred later from timestamps.


## 1. Specification

### Who can perform it

- system_scheduler

### Preconditions

- session.revoked_at is null
- now > idle_expiry_at OR now > absolute_expiry_at

### Inputs

- tenant_id
- sweep_cursor
- batch_size

### What is created

None.

### What is modified

- session.revoked_at
- session.revocation_reason

### What events fire

- session.revoked

### Who is notified

None.

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

The sweep is batched and takes no long-lived lock; each row is updated independently under its own conditional write. A reaper running twice concurrently is harmless by construction, which matters because scheduler at-least-once delivery guarantees it eventually will.


### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_INTERNAL` | 500 | sweep exceeds its time budget with rows remaining | *(silent)* | True | the sweep is resumable by cursor and never restarts from the beginning; a sweep that cannot finish within reaper_interval_minutes raises a platform alert per the idle_expired stuck-state policy |
| `E_DEPENDENCY` | 424 | event bus unavailable | *(silent)* | True | the revocation commits and the session.revoked event is queued in the transactional outbox; revocation must never be blocked on the availability of a notification path |

## 3. Edge cases

**EC-01.** A session that passed idle expiry and then absolute expiry before being swept is reaped with reason=absolute_timeout, the stronger of the two, so a support engineer reading the audit sees the binding constraint rather than the first one crossed.

**EC-02.** Reaping emits one session.revoked event per session. On a large tenant this can be thousands of events at a shift boundary; the event stream is the correct place for them and the notification layer must not fan them out to humans. Notifications on this action are deliberately empty.

**EC-03.** An impersonation session reaped by timeout also ends the impersonation. The impersonating operator's own HQ session is unaffected, and the audit shows the impersonation window closed by timeout rather than by the operator, which is the distinction a compliance review asks about.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_identity_session/session/reap_session.md`.
