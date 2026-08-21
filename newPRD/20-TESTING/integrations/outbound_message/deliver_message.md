---
doc_id: TEST-DELIVER_MESSAGE
title: Test catalogue — Deliver an outbound message
generated: true
source_model: _model/capabilities/integrations.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Deliver an outbound message

*This document is generated. Edit `_model/capabilities/integrations.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `deliver_message` is invoked by an authorised actor, then the declared records are created/updated and events ['integration.delivered', 'integration.dead_lettered'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `deliver_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `deliver_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `deliver_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `deliver_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `deliver_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `deliver_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `deliver_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `deliver_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `deliver_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `deliver_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `deliver_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `deliver_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `deliver_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `deliver_message` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `deliver_message` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: timeout or a 5xx from the far side → expect `E_DEPENDENCY`. retried with exponential backoff and jitter within the budget. Jitter matters because synchronised retries across a tenant's backlog are how a recovering system is knocked over again

**T-018** Cause: the far side signalled rate limiting → expect `E_RATE_LIMIT`. honoured - the retry uses the far side's own retry-after where supplied rather than the default schedule. Ignoring it is how a connection is blocked entirely

**T-019** Cause: the far side rejected the payload structurally → expect `E_VALIDATION`. dead-lettered immediately with no retry. Retrying a structurally invalid payload wastes the budget and delays the moment somebody looks at it

**T-020** Cause: the credential was rejected → expect `E_AUTHN`. the connection moves to degraded and then suspended rather than the message merely failing, because one rejected credential means every subsequent message will fail too

**T-021** Cause: the retry budget is exhausted → expect `E_PRECONDITION`. DEAD-LETTERED, never discarded. This is the deliberate departure from common practice - a discarded billable outcome is revenue that disappears quietly

## Edge cases

**T-022** (EC-01) A far side that returns success and does not process the message. Indistinguishable from success and outside Verity's knowledge. The only mitigation is reconciliation, and the delivered record exists precisely so a reconciliation is possible. The model does not claim more than it can see.

**T-023** (EC-02) A worker dying after sending and before recording the response. The message returns to retrying and is delivered again. The receiver's deduplication on the stable id is what makes this safe, and the contract states the expectation rather than assuming it.

**T-024** (EC-03) A remote system down for longer than the retry budget. Every message for that connection dead-letters and the owner is told once with the count, not once per message. The queue is then replayed in original order after the connection recovers, because order frequently matters to the far side.

**T-025** (EC-04) Replay of a dead letter. Creates a NEW message referencing the original rather than resurrecting it, so the history of failed attempts survives. The new message carries the same payload and a new id, which means a receiver deduplicating on the id will accept it - correct, because a replay is a deliberate re-send.

**T-026** (EC-05) A payload whose redaction set changed after composition. The stored payload is what was sent and is not recomposed. Recomposing at delivery would mean the record differs from what the far side received, and the record is what a dispute reads.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
