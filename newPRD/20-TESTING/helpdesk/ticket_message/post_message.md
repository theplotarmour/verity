---
doc_id: TEST-POST_MESSAGE
title: Test catalogue — Reply on a ticket
generated: true
source_model: _model/capabilities/helpdesk.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Reply on a ticket

*This document is generated. Edit `_model/capabilities/helpdesk.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `post_message` is invoked by an authorised actor, then the declared records are created/updated and events ['ticket.message_posted', 'ticket.first_response_recorded'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `post_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `post_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `post_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `post_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `post_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `post_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `post_message` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `post_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `post_message` succeeds. 

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `post_message` succeeds. 

**T-012** As `consumer` (Consumer (B2C)), invoking `post_message` succeeds. 

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `post_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `post_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `post_message` succeeds. 

## Tenant isolation

**T-016** A principal in tenant A invoking `post_message` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: visibility not stated → expect `E_VALIDATION`, message: 'Choose whether the customer sees this.'. refused rather than defaulted at every layer. This is the one field in the capability with no default anywhere, deliberately

**T-018** Cause: no deliverable channel for an outbound reporter-visible message → expect `E_PRECONDITION`, message: 'There is no way to reach this reporter.'. the message is saved as an internal note with the reason, so the work of writing it is not lost

**T-019** Cause: the reporter's channel is suppressed or has withdrawn consent → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. saved as an internal note. Sending anyway would breach a withdrawal that this platform records elsewhere and must honour here

**T-020** Cause: the ticket is merged → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. names the target ticket, because the reply belongs there

**T-021** Cause: the notification provider is unavailable → expect `E_DEPENDENCY`. the message COMMITS and delivery is queued. A reply lost because a provider was down is a reply the assignee believes they sent

## Edge cases

**T-022** (EC-01) An internal note posted with reporter_visible by mistake. Not preventable by the model beyond making visibility mandatory and the two controls visually distinct. Redaction removes it from the record and cannot remove it from the recipient, and the model says so rather than implying otherwise.

**T-023** (EC-02) An inbound reply arriving on a resolved ticket within the confirmation window. It reopens the ticket only where the tenant configures that; otherwise it posts and notifies the assignee without changing state. Automatic reopening on any inbound message is how a thank-you note reopens a closed ticket.

**T-024** (EC-03) An inbound message from an address other than the reporter's - somebody copied in. Posted with the author party unmatched and flagged, and it does not resume a paused clock, because a third party replying is not the reporter responding.

**T-025** (EC-04) A very long inbound thread quoting the entire history. Stored verbatim and rendered collapsed. Truncating inbound content loses the one line at the bottom that contains the actual answer.

**T-026** (EC-05) An outbound message whose delivery fails after the ticket has been resolved on the strength of it. The failure is reported to the assignee and the ticket is NOT auto-reopened, because the resolution may well be correct and only the notification failed; but the resolution notification is retried on an alternative channel, because a reporter who never learns their ticket was resolved will raise another.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
