---
doc_id: TEST-RELEASE_ASSIGNMENT
title: Test catalogue — Take an assignment back
generated: true
source_model: _model/capabilities/scheduling_dispatch.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Take an assignment back

*This document is generated. Edit `_model/capabilities/scheduling_dispatch.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `release_assignment` is invoked by an authorised actor, then the declared records are created/updated and events ['assignment.released', 'demand.coverage_changed'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `release_assignment` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `release_assignment` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `release_assignment` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `release_assignment` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `release_assignment` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `release_assignment` succeeds. 

**T-008** As `supervisor` (Site Supervisor), invoking `release_assignment` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `release_assignment` succeeds. 

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `release_assignment` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `release_assignment` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `release_assignment` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `release_assignment` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `release_assignment` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `release_assignment` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `release_assignment` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the assignment is already terminal → expect `E_PRECONDITION`. 2xx no-op

**T-018** Cause: reason empty on a published assignment → expect `E_VALIDATION`, message: 'Give a reason. It is shown to the person.'.

**T-019** Cause: session not elevated while the assignment is in progress → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

**T-020** Cause: backfill_request port unavailable while backfill was requested → expect `E_DEPENDENCY`. the release commits and the backfill request is queued. A release that fails because cover could not be sought leaves a commitment that everyone believes is staffed

## Edge cases

**T-021** (EC-01) Releasing the last covering assignment on a demand inside its risk window. The demand moves straight to at_risk and escalates immediately rather than waiting for the next scheduler pass, because the lead time is exactly what has just been lost.

**T-022** (EC-02) Releasing an assignment a resource has already travelled for. This capability cannot know that. Where evidence capture reports presence at the location, the release is refused and the correct action is to end the assignment early, which preserves the period for payment and billing. Releasing it would erase the fact that somebody turned up.

**T-023** (EC-03) A resource releasing their own assignment. Not this action - that is decline before start, and there is no self-release after start. A person who leaves mid-assignment is recorded by the supervisor as an early end, not as a release, because the two produce different pay and billing outcomes and only one of them is the person's own claim.

**T-024** (EC-04) Bulk release across a period, for instance when a location closes at short notice. Supported as a batch of individual releases sharing one correlation_id and one reason, so that each resource receives one message and the audit reads as one decision rather than forty.

## Idempotency and concurrency

**T-025** Replaying the same request with the same idempotency key produces one effect and one event.

**T-026** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-027** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-028** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 28**
