---
doc_id: ACT-HELPDESK-POST_MESSAGE
title: Action — Reply on a ticket
generated: true
source_model: _model/capabilities/helpdesk.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Reply on a ticket

*This document is generated. Edit `_model/capabilities/helpdesk.yaml`, not this file.*

**Entity:** `ticket_message` · **Capability:** `helpdesk`

**Why this exists:** The correspondence is the record, and the single most damaging mistake available on a helpdesk is an internal note that reaches the reporter. Visibility is therefore mandatory with no default anywhere.


## 1. Specification

### Who can perform it

- employee
- supervisor
- consumer
- customer_contact
- integration_principal

### Preconditions

- the ticket is not merged
- visibility is stated
- an outbound message has a resolvable channel

### Inputs

- ticket_id
- direction
- visibility
- body
- channel
- attachment_refs

### What is created

- ticket_message

### What is modified

- ticket state where an inbound reply resumes it
- first_response_at
- clock position

### What events fire

- ticket.message_posted
- ticket.first_response_recorded

### Who is notified

- **to**: the reporter; **channel**: the ticket's channel or their consenting channel; **when**: the message is outbound and reporter_visible; **template**: ticket_update; **cost_class**: utility
- **to**: the assignee; **channel**: in_app_and_push; **when**: the message is inbound; **template**: reporter_replied; **mandatory_operational**: True

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

Messages are appended and do not contend. first_response_at is set by a conditional write on null, so two simultaneous replies cannot both claim it and the earliest wins. Where an internal note and an outbound reply are posted at the same moment, both persist and only the outbound one can set the first response.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | visibility not stated | Choose whether the customer sees this. | False | refused rather than defaulted at every layer. This is the one field in the capability with no default anywhere, deliberately |
| `E_PRECONDITION` | 409 | no deliverable channel for an outbound reporter-visible message | There is no way to reach this reporter. | False | the message is saved as an internal note with the reason, so the work of writing it is not lost |
| `E_PRECONDITION` | 409 | the reporter's channel is suppressed or has withdrawn consent | This action is not available in the current state. | False | saved as an internal note. Sending anyway would breach a withdrawal that this platform records elsewhere and must honour here |
| `E_PRECONDITION` | 409 | the ticket is merged | This action is not available in the current state. | False | names the target ticket, because the reply belongs there |
| `E_DEPENDENCY` | 424 | the notification provider is unavailable | *(silent)* | True | the message COMMITS and delivery is queued. A reply lost because a provider was down is a reply the assignee believes they sent |

## 3. Edge cases

**EC-01.** An internal note posted with reporter_visible by mistake. Not preventable by the model beyond making visibility mandatory and the two controls visually distinct. Redaction removes it from the record and cannot remove it from the recipient, and the model says so rather than implying otherwise.

**EC-02.** An inbound reply arriving on a resolved ticket within the confirmation window. It reopens the ticket only where the tenant configures that; otherwise it posts and notifies the assignee without changing state. Automatic reopening on any inbound message is how a thank-you note reopens a closed ticket.

**EC-03.** An inbound message from an address other than the reporter's - somebody copied in. Posted with the author party unmatched and flagged, and it does not resume a paused clock, because a third party replying is not the reporter responding.

**EC-04.** A very long inbound thread quoting the entire history. Stored verbatim and rendered collapsed. Truncating inbound content loses the one line at the bottom that contains the actual answer.

**EC-05.** An outbound message whose delivery fails after the ticket has been resolved on the strength of it. The failure is reported to the assignee and the ticket is NOT auto-reopened, because the resolution may well be correct and only the notification failed; but the resolution notification is retried on an alternative channel, because a reporter who never learns their ticket was resolved will raise another.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/helpdesk/ticket_message/post_message.md`.
