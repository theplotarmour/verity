---
doc_id: PORTC-NOTIFICATION
title: Port contract — notification
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — notification

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

### `notification`

**Cardinality:** `exactly_one`

Accept a request to tell an audience something, where the audience is expressed as a role, a relationship or a subscription and never as a person; resolve recipients, channels, consent, preferences and quiet hours; deduplicate; batch; send; and report the delivery outcome back to the requesting capability. Reporting the outcome back is part of the contract, because the capability that asked is the only one that knows who is waiting.


## Consumers and their declared behaviour when unbound

### `assets`

**Cardinality:** `zero_or_one`

Deliver warranty expiry, plan due, meter stale, condition and custody messages.

**When unbound.** Everything degrades to console lists. Warranty expiry in particular becomes invisible, which converts a claimable repair into a paid one.

### `attendance_verification`

**Cardinality:** `zero_or_one`

Deliver missing-claim, open-shift, dispute and adjustment messages, treating downward pay adjustments and open-shift alerts as mandatory_operational.

**When unbound.** Everything degrades to console lists. The open-shift alert in particular becomes invisible to the person it concerns, which means a forgotten sign-out is discovered at settlement rather than the same evening. This is the most costly unbound behaviour in this capability.


### `backfill_dispatch`

**Cardinality:** `zero_or_one`

Deliver offers with a delivery receipt, across push, SMS, WhatsApp and voice, treating backfill offers as mandatory_operational so they override quiet hours.

**When unbound.** Offers can only be made through the spoken_by_dispatcher channel, recorded manually. The capability degrades to a ranked call list, which is genuinely useful and is not automation. The pack documentation must say so plainly, because a ranked list that nobody is paged about is indistinguishable from a system that is not working.


### `billing`

**Cardinality:** `zero_or_one`

Deliver invoices, statements, reminders and dispute correspondence, honouring channel consent and cost class.

**When unbound.** Nothing is delivered. Documents must be exported and sent by hand. Collection sequences produce a list of who to contact rather than contacting them, which is materially weaker and remains usable.

### `booking`

**Cardinality:** `zero_or_one`

Deliver confirmations, reminders, reschedules, cancellations and waiting-list offers, honouring consent, quiet hours and cost class.

**When unbound.** Nothing is sent. Confirmations and reminders become the responsibility of whoever took the booking, by telephone. For a self-service booking there is no telephone call, so a self-service booking with no notification provider is a booking the person has no record of - which is why binding this port is a publication requirement for any pack enabling self-service channels.


### `core_audit`

**Cardinality:** `zero_or_one`

Deliver verification-failure and hold-review messages.

**When unbound.** Alerts are written to the platform health surface and to the tenant health surface and are not delivered to a channel. Verification failure is deliberately NOT swallowed - if it cannot be delivered it is escalated by making the tenant's audit surface display it persistently until acknowledged.


### `core_identity_session`

**Cardinality:** `zero_or_one`

Deliver one-time codes, new-device alerts, session-revoked, access-changed and account-state messages, honouring the mandatory_operational and mandatory_legal classes.

**When unbound.** Phone-OTP authentication becomes impossible, which removes the primary sign-in path for the target workforce entirely. Password authentication still works. Every security alert - new device, sessions revoked by an administrator, account suspended - becomes invisible to the person it concerns. A pack enabling phone-OTP sign-in without binding this port cannot be published.


### `evidence_capture`

**Cardinality:** `zero_or_one`

Deliver pending-upload, integrity-failure and orphaned-evidence messages.

**When unbound.** Conditions surface as console lists. The pending-upload alert in particular becomes invisible to the person holding the device, which is the one person who can fix it - so this degradation directly increases permanent evidence loss.

### `helpdesk`

**Cardinality:** `zero_or_one`

Deliver acknowledgements, updates, chases, resolutions and reopens across the reporter's consenting channels, and internal alerts to queues and assignees.

**When unbound.** Nothing is sent and nothing is received. A helpdesk with no notification provider accepts tickets raised by staff, works them in the console and communicates outside the system, which loses the correspondence record that is most of the value.

### `hq_console`

**Cardinality:** `zero_or_one`

Deliver support-access, suspension, closure, erasure-countdown, withdrawal and deployment messages to tenant owners and to platform operators.

**When unbound.** Everything degrades to console lists. The erasure countdown in particular becomes invisible to the tenant, which would mean a customer's data being destroyed on a schedule they were never reminded of. A pack or environment binding hq_console without notification should be treated as incomplete.


### `integrations`

**Cardinality:** `zero_or_one`

Deliver credential expiry, degradation, dead-letter and quarantine messages to connection owners and to finance where revenue is affected.

**When unbound.** Every condition degrades to a console list. This is the single most damaging unbound behaviour in this capability, because the entire premise is that a failure reaches a person, and a list on a screen nobody opens is exactly the log this capability exists to replace. A pack binding integrations without notification should be treated as incomplete rather than as configured.


### `inventory`

**Cardinality:** `zero_or_one`

Deliver low-stock, expiry, negative-balance, count-due and variance messages.

**When unbound.** Everything degrades to console lists. Expiry warnings in particular become invisible, which for anything perishable converts a preventable write-off into an inevitable one.

### `kitchen_flow`

**Cardinality:** `zero_or_one`

Deliver readiness and collection signals to whoever collects, and unrouted and lateness alerts to the supervisor.

**When unbound.** Everything is shown on the station and supervisor displays and nothing is pushed. For an operation where everybody is in one room this is entirely sufficient. For one where the collector is elsewhere, readiness is invisible to them, and a pack enabling remote collection must bind this port.


### `lease_management`

**Cardinality:** `zero_or_one`

Deliver renewal window, escalation, arrears, notice, deposit and reconciliation messages.

**When unbound.** Every date-driven obligation degrades to a console list. This is the most damaging unbound behaviour here, because the entire premise of the capability is that a date nobody is watching produces a consequence nobody chose - an automatic renewal, a missed escalation, an unreturned deposit.


### `offline_sync`

**Cardinality:** `zero_or_one`

Deliver stranded-work, conflict and rejection messages to the acting principal and their supervisor.

**When unbound.** Every condition degrades to a console list and to the device's own display. The device display is the more important of the two here, because the person holding it is the one who can fix stranded work, and it works with no server at all - which is why the local surface is the primary channel and the notification is the escalation.


### `order`

**Cardinality:** `zero_or_one`

Deliver confirmations, promise changes, delay and completion messages to the ordering party and hold or stall alerts to staff.

**When unbound.** Nothing is sent. For staff-entered orders somebody tells the party directly. For self-service orders the party has no confirmation at all, which makes binding this a publication requirement for any pack enabling a self-service channel.

### `party`

**Cardinality:** `zero_or_one`

Deliver merge-review, unowned-relationship and consent-expiry messages, honouring channel consent and suppression.

**When unbound.** Queues and lists are still produced and are visible in the console; nothing is pushed. Every threshold in this capability's stuck-state policies degrades from a notification to a list, which is weaker but not broken.

### `people`

**Cardinality:** `zero_or_one`

Deliver expiry warnings, absence decisions, onboarding-incomplete and hours-breach messages.

**When unbound.** Everything degrades to console lists. Qualification expiry in particular becomes invisible-by-default, which is the single most consequential degradation in this capability and is stated in the port doc.

### `procurement`

**Cardinality:** `zero_or_one`

Deliver approval requests, overdue-delivery chases, discrepancy and variance messages, and supplier communications.

**When unbound.** Everything degrades to console lists and no commitment can be sent to a supplier electronically. sent_via falls back to telephone or in_person, recorded manually, which is a real operating mode and not a failure.

### `reporting`

**Cardinality:** `zero_or_one`

Deliver scheduled reports, broken-report and failed-run messages, and export notifications.

**When unbound.** Scheduling is unavailable and reports are interactive only. Everything else works, and the absence removes the mechanism by which a report reaches somebody who was not already looking for it.

### `scheduling_dispatch`

**Cardinality:** `zero_or_one`

Deliver publication, change, acceptance-request, coverage-risk and no-show messages, honouring quiet hours except where marked mandatory_operational.

**When unbound.** Nothing is pushed. Assignments still publish and are visible in the app, which means a resource who does not open the app does not know. This is the most damaging unbound behaviour in the whole library and the pack documentation must say so plainly.


### `search`

**Cardinality:** `zero_or_one`

Deliver saved-search result alerts and broken-search messages.

**When unbound.** notify_on_new_results cannot be enabled and existing subscriptions are shown as inactive rather than silently not firing. Everything else works.

### `sites`

**Cardinality:** `zero_or_one`

Deliver geofence-quality, stale-location and closure-conflict messages.

**When unbound.** Conditions are surfaced as console lists only. Geofence quality degradation in particular becomes invisible-by-default, which is stated in the port documentation because it is the failure this capability most needs somebody to notice.

### `sla_contract`

**Cardinality:** `zero_or_one`

Deliver breach, approaching-breach, renewal, penalty and dispute messages.

**When unbound.** Everything degrades to console lists. Approaching-breach in particular becomes invisible, which converts this capability from a prevention tool into a reporting tool.

### `work_order`

**Cardinality:** `zero_or_one`

Deliver assignment, hold, sign-off request, breach and reopen messages.

**When unbound.** All conditions degrade to console lists. Sign-off requests in particular become invisible to the signer, which turns awaiting_signoff into a permanent state.

## Generated provider conformance tests

**PC-01** A provider bound to `notification` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `notification` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `notification` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

