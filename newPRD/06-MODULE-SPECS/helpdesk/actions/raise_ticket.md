---
doc_id: ACT-HELPDESK-RAISE_TICKET
title: Action — Report something
generated: true
source_model: _model/capabilities/helpdesk.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Report something

*This document is generated. Edit `_model/capabilities/helpdesk.yaml`, not this file.*

**Entity:** `ticket` · **Capability:** `helpdesk`

**Why this exists:** The front door. It must accept anything from anywhere, including reports with no category, no location, no identifiable reporter and no coherent description, because the alternative is a telephone call that appears in no report at all.


## 1. Specification

### Who can perform it

- consumer
- customer_contact
- employee
- supervisor
- integration_principal

### Preconditions

- the tenant is not suspended
- a subject line or a body is present

### Inputs

- subject
- body
- reporter_party_ref
- reporter_contact_raw
- channel
- location_ref
- subject_ref
- category_id
- stated_priority
- attachment_refs

### What is created

- ticket
- an inbound ticket_message carrying the original report verbatim

### What is modified

None.

### What events fire

- ticket.raised

### Who is notified

- **to**: the resolved queue's watchers; **channel**: in_app_and_push; **when**: always; **template**: new_ticket; **must_include**: ['reference', 'subject', 'priority', 'reporter']; **batching_policy**: digest per queue per configured interval, except urgent which is immediate
- **to**: the reporter; **channel**: the channel they used, or their consenting channel; **when**: the tenant sends acknowledgements; **template**: ticket_acknowledged; **must_include**: ['reference', 'how_to_add_information']; **cost_class**: utility; **note**: this acknowledgement explicitly does NOT count as the first response

### Can it be undone

Yes.

### Concurrency behaviour

Tickets do not contend. Two reports of the same matter both become tickets and are merged by a person, deliberately, because two reports of one symptom are sometimes two matters and only a human can tell.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | neither subject nor body present | Say what the problem is. | False | the only refusal on this path, and even it accepts a subject alone or a body alone |
| `E_PRECONDITION` | 409 | the chosen category requires a subject and none is supplied | *(silent)* | False | the ticket is CREATED without the category rather than refused, and triage sets it. Refusing a report because a classification is incomplete is exactly the behaviour that sends people to the telephone |
| `E_RATE_LIMIT` | 429 | more than raise_burst per source per hour | Too many attempts. Try again shortly. | True | catches a mail loop, which otherwise produces thousands of tickets overnight. The limit is per source address and generous enough that a genuine reporter never meets it |
| `E_QUOTA` | 402 | open ticket limit reached | Plan limit reached. | False |  |
| `E_DEPENDENCY` | 424 | the party directory is bound but unavailable | *(silent)* | True | the ticket is CREATED with the raw contact and no party match, and matching is retried. A report must never be lost because a directory is down |

## 3. Edge cases

**EC-01.** An automated message loop - an out-of-office replying to an acknowledgement which triggers another acknowledgement. Caught by the rate limit and by never acknowledging a message whose headers indicate it is automated. This single behaviour prevents the classic overnight helpdesk flood.

**EC-02.** A reporter stating that everything is urgent. Recorded as priority_source=reporter_stated, and the effective priority is whatever the category or rule says unless a person overrides it. Treating a stated urgency as the actual priority means every ticket is urgent within a month and the field stops meaning anything.

**EC-03.** A report arriving from an address matching two parties. No party is matched and the raw contact is retained. Guessing between two parties produces a ticket visible to the wrong customer, which is a disclosure rather than an inconvenience.

**EC-04.** A monitoring signal raising a ticket automatically. Fully supported through channel=monitoring_signal, and idempotent on the signal's own identifier so that a flapping condition produces one ticket rather than one per flap. The ticket carries the signal's own recovery notification when it clears, and does not auto-resolve - a condition clearing is not the same as somebody having dealt with it.

**EC-05.** A walk-in report typed by staff on behalf of somebody. reporter_party_ref is the reporter and the author of the inbound message is the staff member, so the correspondence reads correctly and the response-time measurement still starts from the report.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/helpdesk/ticket/raise_ticket.md`.
