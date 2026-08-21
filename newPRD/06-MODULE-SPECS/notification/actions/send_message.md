---
doc_id: ACT-NOTIFICATION-SEND_MESSAGE
title: Action — Send a queued message
generated: true
source_model: _model/capabilities/notification.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Send a queued message

*This document is generated. Edit `_model/capabilities/notification.yaml`, not this file.*

**Entity:** `notification_message` · **Capability:** `notification`

**Why this exists:** Separated from the request because the two happen at different times under different conditions - a message may be held for hours, batched, or waiting on a provider - and because retry behaviour belongs here rather than in every calling capability.


## 1. Specification

### Who can perform it

- system

### Preconditions

- the message is queued and not suppressed
- a transport for the channel is available
- the recipient channel is still consenting and unsuppressed

### Inputs

- message_id
- attempt_number

### What is created

None.

### What is modified

- delivery_state
- provider_reference
- attempt_count
- estimated cost

### What events fire

- notification.sent
- notification.failed

### Who is notified

None.

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

A message is claimed by a single sender with a conditional state write, so two workers cannot both submit it. Retries use exponential backoff with jitter; the retry schedule and the total budget are configuration rather than code, because the right number of retries differs sharply between a push notification and a message that costs money.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_DEPENDENCY` | 424 | transient provider failure | *(silent)* | True | retried with exponential backoff and jitter up to the retry budget, then failed over to the next channel in the preference order where one is configured. A transient failure that exhausts its budget on one channel and never tries another is a message lost to a temporary outage |
| `E_PRECONDITION` | 409 | permanent provider rejection, for example an unregistered template or an invalid header | *(silent)* | False | no retry. The rejection reason is recorded verbatim and the template is flagged, because retrying a structurally invalid message wastes the budget and delays the fallback |
| `E_PRECONDITION` | 409 | the recipient channel became suppressed between queueing and sending | *(silent)* | False | suppressed rather than sent. Consent withdrawn after a message is queued is still consent withdrawn |
| `E_VALIDATION` | 422 | the rendered body exceeds the channel maximum | *(silent)* | False | refused rather than truncated. A truncated message that ends mid-sentence is worse than one that was not sent, and the template's failure rate monitor is what surfaces the pattern |
| `E_QUOTA` | 402 | provider rate limit | *(silent)* | False | queued and retried, and the delay is reported to the originator where the message has a relevance window, so it can decide whether a late message is still worth sending |

## 3. Edge cases

**EC-01.** A provider reporting delivery for a message that never reached the person - a message delivered to a handset that is off, or to a mailbox nobody reads. The model records delivered and claims nothing more. Every capability that escalates on non-delivery must therefore escalate on non-RESPONSE rather than on non-delivery, and that requirement is stated in the port contract rather than left to each capability to discover.

**EC-02.** Failover between channels. Configured as an ordered preference per category, and each attempt is a separate message row with its own cost, so the cost of failover is visible rather than hidden inside a retry count.

**EC-03.** A cost-bearing message sent successfully to a wrong number. Recorded, charged and irrecoverable. The mitigation is at the party capability's channel verification and this capability's record simply makes the cost visible, which is the honest division of responsibility.

**EC-04.** A provider outage lasting hours. Messages queue, the queue-lag monitor fires to platform_operator, and messages whose relevance windows pass are expired with their originators told. Nothing is silently dropped and nothing is sent long after it mattered.

**EC-05.** A message whose recipient is deactivated between queueing and sending. Suppressed, and the originating capability is told, because a notification to a departed person is exactly the condition role-based addressing exists to prevent and its occurrence means an audience was resolved to a person somewhere.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/notification/notification_message/send_message.md`.
