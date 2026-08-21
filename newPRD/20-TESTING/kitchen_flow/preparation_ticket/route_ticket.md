---
doc_id: TEST-ROUTE_TICKET
title: Test catalogue — Route work to stations
generated: true
source_model: _model/capabilities/kitchen_flow.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Route work to stations

*This document is generated. Edit `_model/capabilities/kitchen_flow.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `route_ticket` is invoked by an authorised actor, then the declared records are created/updated and events ['preparation.routed', 'preparation.unrouted'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `route_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `route_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `route_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `route_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `route_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `route_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `route_ticket` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `route_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `route_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `route_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `route_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `route_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `route_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `route_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `route_ticket` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: a line matches no open station → expect `E_PRECONDITION`. the ticket enters UNROUTED rather than failing. An error here would be swallowed by an integration; a state is visible on a screen a human is already looking at

**T-018** Cause: the location has no stations configured at all → expect `E_PRECONDITION`. the ticket enters unrouted and the supervisor is told that nothing is configured, which is a different message from nothing matching

**T-019** Cause: a manual assignment names a station whose tags do not match the line → expect `E_VALIDATION`, message: 'This station does not handle that.'. overridable with a reason, because a supervisor at the counter knows something the tags do not

**T-020** Cause: the ticket would create more than max_steps_per_ticket → expect `E_QUOTA`. routed up to the limit and flagged. Refusing entirely would leave the whole request unprepared over a configuration mistake

## Edge cases

**T-021** (EC-01) A line matching two stations. Routed to the one with the lowest sequence_position, unless the line declares multi-station preparation, in which case it produces a step at each and the ticket is not ready until both complete. Duplicating every ambiguous line would turn one request into two pieces of work.

**T-022** (EC-02) Routing while offline. Performed locally against the cached station set, and re-evaluated on sync. Where the server's routing differs, the local routing stands for steps already started and the difference is recorded, because moving work that somebody has begun is worse than a routing inconsistency.

**T-023** (EC-03) A ticket arriving for a location whose stations are all closed, at the end of a service period. Enters unrouted and alerts loudly. Automatically closing the request would be a decision this capability may not take - it is the source's request and only the source can withdraw it.

**T-024** (EC-04) Re-routing after a station opens. The unrouted ticket is routed automatically without a human, because the condition that caused it has been fixed and re-alerting somebody who has just fixed it is noise.

**T-025** (EC-05) A ticket whose source cancels it during routing. The cancellation wins; steps created in the same transaction are cancelled with it, so no station ever sees a step for a cancelled request.

## Idempotency and concurrency

**T-026** Replaying the same request with the same idempotency key produces one effect and one event.

**T-027** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-028** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-029** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 29**
