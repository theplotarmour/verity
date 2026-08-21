---
doc_id: ACT-NOTIFICATION-SET_PREFERENCE
title: Action — Choose what to be told
generated: true
source_model: _model/capabilities/notification.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Choose what to be told

*This document is generated. Edit `_model/capabilities/notification.yaml`, not this file.*

**Entity:** `notification_preference` · **Capability:** `notification`

**Why this exists:** A recipient who cannot turn something off will turn everything off, usually at the operating system level where the tenant can neither see it nor recover from it. Granular, honest preferences are what protect the messages that matter.


## 1. Specification

### Who can perform it

- any_authenticated
- consumer
- customer_contact
- tenant_admin

### Preconditions

- the category exists
- the acting principal is the recipient or holds administer over notification preferences

### Inputs

- principal_or_party
- category_key
- channel
- enabled
- digest_mode
- quiet_hours_start
- quiet_hours_end
- timezone
- reason

### What is created

- notification_preference

### What is modified

- previous preference superseded

### What events fire

- notification.preference_changed

### Who is notified

- **to**: the recipient; **channel**: in_app; **when**: the change was made by an administrator rather than by them; **template**: preference_changed_for_you; **must_include**: ['category', 'channel', 'new_setting', 'actor_display_name', 'reason']; **mandatory_operational**: True

### Can it be undone

Yes.

### Concurrency behaviour

Preferences are superseded rather than updated, so concurrent writes produce an ordered history and the latest set_at wins. The history is retained because what somebody chose and when is what is asked about after a complaint.

### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | the category contains mandatory templates and the request disables it | Some of these cannot be turned off. | False | the request partially succeeds for the non-mandatory templates and the recipient is shown exactly which messages they will still receive and why. Silently ignoring the request is what teaches people to disable notifications at the operating system |
| `E_VALIDATION` | 422 | quiet hours set with no timezone | Choose a timezone. | False | never defaulted from the tenant |
| `E_AUTHZ_SCOPE` | 404 | setting a preference for another principal without authority | Not found. | False |  |
| `E_VALIDATION` | 422 | an administrator overriding a recipient-set preference with no reason | Give a reason. It is shown to them. | False |  |

## 3. Edge cases

**EC-01.** A recipient disabling every channel for an operationally significant category. Permitted for non-mandatory categories, and their supervisor is told once. It is legitimate and the consequence - that the originating capability cannot rely on reaching them - must be visible to somebody rather than only to the recipient.

**EC-02.** Quiet hours that span midnight. Supported, and this is where most implementations fail. The window is evaluated as a wrapping interval in the recipient's own timezone, and the test cases for it are generated explicitly.

**EC-03.** An administrator enabling a channel a recipient turned off. Permitted with a reason and the recipient is told. Doing it silently is the fastest way to lose the recipient's trust in every message the platform sends.

**EC-04.** A recipient with no preference row at all. The pack default applies. The proportion of recipients who have never set anything is reported, because in a tenant where nobody has ever changed a preference the screen is usually unreachable rather than the defaults perfect.

**EC-05.** A consumer setting preferences without an account. Handled through the party channel consent record rather than here, and the two are deliberately separate - consent is a lawful basis and a preference is a choice about volume, and conflating them means a withdrawal of consent looks like a preference somebody can flip back.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/notification/notification_preference/set_preference.md`.
