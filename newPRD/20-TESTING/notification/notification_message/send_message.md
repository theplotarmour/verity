---
doc_id: TEST-SEND_MESSAGE
title: Test catalogue — Send a queued message
generated: true
source_model: _model/capabilities/notification.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Send a queued message

*This document is generated. Edit `_model/capabilities/notification.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `send_message` is invoked by an authorised actor, then the declared records are created/updated and events ['notification.sent', 'notification.failed'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `send_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `send_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `send_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `send_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `send_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `send_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `send_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `send_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `send_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `send_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `send_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `send_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `send_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `send_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `send_message` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: transient provider failure → expect `E_DEPENDENCY`. retried with exponential backoff and jitter up to the retry budget, then failed over to the next channel in the preference order where one is configured. A transient failure that exhausts its budget on one channel and never tries another is a message lost to a temporary outage

**T-018** Cause: permanent provider rejection, for example an unregistered template or an invalid header → expect `E_PRECONDITION`. no retry. The rejection reason is recorded verbatim and the template is flagged, because retrying a structurally invalid message wastes the budget and delays the fallback

**T-019** Cause: the recipient channel became suppressed between queueing and sending → expect `E_PRECONDITION`. suppressed rather than sent. Consent withdrawn after a message is queued is still consent withdrawn

**T-020** Cause: the rendered body exceeds the channel maximum → expect `E_VALIDATION`. refused rather than truncated. A truncated message that ends mid-sentence is worse than one that was not sent, and the template's failure rate monitor is what surfaces the pattern

**T-021** Cause: provider rate limit → expect `E_QUOTA`. queued and retried, and the delay is reported to the originator where the message has a relevance window, so it can decide whether a late message is still worth sending

## Edge cases

**T-022** (EC-01) A provider reporting delivery for a message that never reached the person - a message delivered to a handset that is off, or to a mailbox nobody reads. The model records delivered and claims nothing more. Every capability that escalates on non-delivery must therefore escalate on non-RESPONSE rather than on non-delivery, and that requirement is stated in the port contract rather than left to each capability to discover.

**T-023** (EC-02) Failover between channels. Configured as an ordered preference per category, and each attempt is a separate message row with its own cost, so the cost of failover is visible rather than hidden inside a retry count.

**T-024** (EC-03) A cost-bearing message sent successfully to a wrong number. Recorded, charged and irrecoverable. The mitigation is at the party capability's channel verification and this capability's record simply makes the cost visible, which is the honest division of responsibility.

**T-025** (EC-04) A provider outage lasting hours. Messages queue, the queue-lag monitor fires to platform_operator, and messages whose relevance windows pass are expired with their originators told. Nothing is silently dropped and nothing is sent long after it mattered.

**T-026** (EC-05) A message whose recipient is deactivated between queueing and sending. Suppressed, and the originating capability is told, because a notification to a departed person is exactly the condition role-based addressing exists to prevent and its occurrence means an audience was resolved to a person somewhere.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
