---
doc_id: ACT-INTEGRATIONS-DELIVER_MESSAGE
title: Action — Deliver an outbound message
generated: true
source_model: _model/capabilities/integrations.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Deliver an outbound message

*This document is generated. Edit `_model/capabilities/integrations.yaml`, not this file.*

**Entity:** `outbound_message` · **Capability:** `integrations`

**Why this exists:** The mechanics of surviving an unreliable far side. Stated explicitly because the retry schedule, the stable identifier and the dead-letter behaviour are product commitments that other capabilities depend on rather than implementation choices.


## 1. Specification

### Who can perform it

- system

### Preconditions

- the connection is active or degraded
- the rate limit permits
- the message is pending or due for retry

### Inputs

- message_id

### What is created

None.

### What is modified

- attempt_count
- next_attempt_at
- delivery state
- connection health counters

### What events fire

- integration.delivered
- integration.dead_lettered

### Who is notified

- **to**: the connection owner; **channel**: in_app; **when**: the message dead-letters; **template**: delivery_failed; **must_include**: ['connection', 'event_type', 'far_side_response', 'count_of_similar']; **batching_policy**: grouped by connection and error, never one message at a time
- **to**: finance and ops_manager; **channel**: in_app; **when**: a dead-lettered payload carries a billable outcome or an attendance record; **template**: revenue_affecting_delivery_failure; **priority**: high

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

A message is claimed by one worker with a conditional state write, so two workers cannot deliver it simultaneously - though the far side may still see two deliveries if a worker dies after sending and before recording, which is precisely why the stable id exists. Per-connection concurrency is bounded so that one busy tenant cannot exhaust a remote system's capacity for another.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_DEPENDENCY` | 424 | timeout or a 5xx from the far side | *(silent)* | True | retried with exponential backoff and jitter within the budget. Jitter matters because synchronised retries across a tenant's backlog are how a recovering system is knocked over again |
| `E_RATE_LIMIT` | 429 | the far side signalled rate limiting | *(silent)* | True | honoured - the retry uses the far side's own retry-after where supplied rather than the default schedule. Ignoring it is how a connection is blocked entirely |
| `E_VALIDATION` | 422 | the far side rejected the payload structurally | *(silent)* | False | dead-lettered immediately with no retry. Retrying a structurally invalid payload wastes the budget and delays the moment somebody looks at it |
| `E_AUTHN` | 401 | the credential was rejected | *(silent)* | False | the connection moves to degraded and then suspended rather than the message merely failing, because one rejected credential means every subsequent message will fail too |
| `E_PRECONDITION` | 409 | the retry budget is exhausted | *(silent)* | False | DEAD-LETTERED, never discarded. This is the deliberate departure from common practice - a discarded billable outcome is revenue that disappears quietly |

## 3. Edge cases

**EC-01.** A far side that returns success and does not process the message. Indistinguishable from success and outside Verity's knowledge. The only mitigation is reconciliation, and the delivered record exists precisely so a reconciliation is possible. The model does not claim more than it can see.

**EC-02.** A worker dying after sending and before recording the response. The message returns to retrying and is delivered again. The receiver's deduplication on the stable id is what makes this safe, and the contract states the expectation rather than assuming it.

**EC-03.** A remote system down for longer than the retry budget. Every message for that connection dead-letters and the owner is told once with the count, not once per message. The queue is then replayed in original order after the connection recovers, because order frequently matters to the far side.

**EC-04.** Replay of a dead letter. Creates a NEW message referencing the original rather than resurrecting it, so the history of failed attempts survives. The new message carries the same payload and a new id, which means a receiver deduplicating on the id will accept it - correct, because a replay is a deliberate re-send.

**EC-05.** A payload whose redaction set changed after composition. The stored payload is what was sent and is not recomposed. Recomposing at delivery would mean the record differs from what the far side received, and the record is what a dispute reads.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/integrations/outbound_message/deliver_message.md`.
