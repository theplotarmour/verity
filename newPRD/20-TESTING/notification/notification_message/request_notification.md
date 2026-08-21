---
doc_id: TEST-REQUEST_NOTIFICATION
title: Test catalogue — Tell somebody something
generated: true
source_model: _model/capabilities/notification.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Tell somebody something

*This document is generated. Edit `_model/capabilities/notification.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `request_notification` is invoked by an authorised actor, then the declared records are created/updated and events ['notification.requested', 'notification.audience_empty'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `request_notification` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `request_notification` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `request_notification` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `request_notification` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `request_notification` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `request_notification` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `request_notification` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `request_notification` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `request_notification` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `request_notification` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `request_notification` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `request_notification` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `request_notification` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `request_notification` succeeds. 

## Tenant isolation

**T-016** A principal in tenant A invoking `request_notification` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the template is not approved → expect `E_PRECONDITION`. the request is REFUSED and the originator is told, rather than sending an unregistered template that the provider will reject with an error nobody can interpret

**T-018** Cause: the audience resolves to nobody → expect `E_PRECONDITION`. recorded as an empty-audience event and reported to the originating capability. This is the failure that matters most - a message nobody received because the role has no holders looks exactly like a message that was sent

**T-019** Cause: a declared variable has no supplied value → expect `E_VALIDATION`. refused rather than rendering an empty gap in a sentence. A message reading that a shift starts at blank is worse than no message

**T-020** Cause: a message with this dedupe key already exists in the window → expect `E_CONFLICT_UNIQUE`. returns the existing message with 200

**T-021** Cause: the tenant's cost ceiling for the period is exhausted → expect `E_QUOTA`. non-mandatory messages are SUPPRESSED and mandatory ones still send. The tenant_owner is told immediately. A ceiling that silently stops a safety alert would be a worse failure than the spend it prevents

**T-022** Cause: one source exceeding its send rate → expect `E_RATE_LIMIT`. throttled with the overflow batched rather than dropped, because the usual cause is a bulk operation and dropping loses real notifications

## Edge cases

**T-023** (EC-01) {'An audience expressed as a role with no active holders. The empty-audience event is the whole point': 'a coverage alert addressed to a supervisor role at a location with no supervisor is silence that looks identical to success, and the originating capability must be able to tell the difference.'}

**T-024** (EC-02) A bulk operation emitting one notification per row - a roster published for two hundred people. Batching per recipient per category collapses it to one message each. Where a member is high priority the batch dispatches immediately, because batching an urgent message is how it arrives too late to matter.

**T-025** (EC-03) A recipient in a different timezone from the tenant. Quiet hours resolve against the recipient's own timezone where they have one, and against the location's where the message is location-scoped. Resolving against the tenant's is the default failure and it wakes people at four in the morning.

**T-026** (EC-04) A message whose relevance window passes while held for quiet hours. Expired rather than sent late, and the originator is told. A reminder about a shift that has started teaches the recipient that these messages are not worth reading, which costs more than the missed reminder.

**T-027** (EC-05) The same event triggering notifications from two capabilities - a work order completion and a billing event. Both send, because they are different messages to possibly different audiences. Deduplication keys on the trigger AND the template, so it collapses genuine duplicates without collapsing two distinct messages that share a cause.

**T-028** (EC-06) A cost ceiling reached mid-period. Non-mandatory messages suppress and are recorded as suppressed so the originators know. Mandatory operational and legal messages continue regardless of the ceiling, and the overspend is reported rather than prevented.

## Idempotency and concurrency

**T-029** Replaying the same request with the same idempotency key produces one effect and one event.

**T-030** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-031** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-032** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 32**
