---
doc_id: ACT-NOTIFICATION-REQUEST_NOTIFICATION
title: Action — Tell somebody something
generated: true
source_model: _model/capabilities/notification.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Tell somebody something

*This document is generated. Edit `_model/capabilities/notification.yaml`, not this file.*

**Entity:** `notification_message` · **Capability:** `notification`

**Why this exists:** The single entry point every capability uses. Its contract - audience by role or relationship, never by person - is what stops the platform accumulating notifications addressed to people who have left, which is the most common way an operational alert silently stops reaching anybody.


## 1. Specification

### Who can perform it

- system
- integration_principal
- any_authenticated

### Preconditions

- the template resolves and is approved
- the audience expression resolves to at least one recipient or to a recorded empty set

### Inputs

- template_key
- audience_expression
- variables
- source_ref
- trigger_event_id
- priority
- relevance_window

### What is created

- notification_message per resolved recipient
- batch membership where batching applies

### What is modified

None.

### What events fire

- notification.requested
- notification.audience_empty

### Who is notified

None.

### Can it be undone

Yes.

### Concurrency behaviour

Deduplication is enforced by a unique index on dedupe_key within the window rather than by a check, so two concurrent requests for the same trigger produce one message. Audience resolution happens at request time against a consistent snapshot, so a role change mid-resolution does not produce a partial audience.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | the template is not approved | *(silent)* | False | the request is REFUSED and the originator is told, rather than sending an unregistered template that the provider will reject with an error nobody can interpret |
| `E_PRECONDITION` | 409 | the audience resolves to nobody | *(silent)* | False | recorded as an empty-audience event and reported to the originating capability. This is the failure that matters most - a message nobody received because the role has no holders looks exactly like a message that was sent |
| `E_VALIDATION` | 422 | a declared variable has no supplied value | *(silent)* | False | refused rather than rendering an empty gap in a sentence. A message reading that a shift starts at blank is worse than no message |
| `E_CONFLICT_UNIQUE` | 409 | a message with this dedupe key already exists in the window | *(silent)* | False | returns the existing message with 200 |
| `E_QUOTA` | 402 | the tenant's cost ceiling for the period is exhausted | *(silent)* | False | non-mandatory messages are SUPPRESSED and mandatory ones still send. The tenant_owner is told immediately. A ceiling that silently stops a safety alert would be a worse failure than the spend it prevents |
| `E_RATE_LIMIT` | 429 | one source exceeding its send rate | *(silent)* | True | throttled with the overflow batched rather than dropped, because the usual cause is a bulk operation and dropping loses real notifications |

## 3. Edge cases

**EC-01.** {'An audience expressed as a role with no active holders. The empty-audience event is the whole point': 'a coverage alert addressed to a supervisor role at a location with no supervisor is silence that looks identical to success, and the originating capability must be able to tell the difference.'}

**EC-02.** A bulk operation emitting one notification per row - a roster published for two hundred people. Batching per recipient per category collapses it to one message each. Where a member is high priority the batch dispatches immediately, because batching an urgent message is how it arrives too late to matter.

**EC-03.** A recipient in a different timezone from the tenant. Quiet hours resolve against the recipient's own timezone where they have one, and against the location's where the message is location-scoped. Resolving against the tenant's is the default failure and it wakes people at four in the morning.

**EC-04.** A message whose relevance window passes while held for quiet hours. Expired rather than sent late, and the originator is told. A reminder about a shift that has started teaches the recipient that these messages are not worth reading, which costs more than the missed reminder.

**EC-05.** The same event triggering notifications from two capabilities - a work order completion and a billing event. Both send, because they are different messages to possibly different audiences. Deduplication keys on the trigger AND the template, so it collapses genuine duplicates without collapsing two distinct messages that share a cause.

**EC-06.** A cost ceiling reached mid-period. Non-mandatory messages suppress and are recorded as suppressed so the originators know. Mandatory operational and legal messages continue regardless of the ceiling, and the overspend is reported rather than prevented.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/notification/notification_message/request_notification.md`.
