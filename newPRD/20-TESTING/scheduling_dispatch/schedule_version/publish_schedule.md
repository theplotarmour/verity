---
doc_id: TEST-PUBLISH_SCHEDULE
title: Test catalogue — Publish the schedule
generated: true
source_model: _model/capabilities/scheduling_dispatch.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Publish the schedule

*This document is generated. Edit `_model/capabilities/scheduling_dispatch.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `publish_schedule` is invoked by an authorised actor, then the declared records are created/updated and events ['schedule.published', 'assignment.published per assignment'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `publish_schedule` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `publish_schedule` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `publish_schedule` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `publish_schedule` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `publish_schedule` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `publish_schedule` succeeds. 

**T-008** As `supervisor` (Site Supervisor), invoking `publish_schedule` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `publish_schedule` succeeds. 

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `publish_schedule` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `publish_schedule` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `publish_schedule` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `publish_schedule` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `publish_schedule` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `publish_schedule` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `publish_schedule` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: planned assignments in the period are neither included nor excluded → expect `E_PRECONDITION`, message: 'Some assignments are neither published nor excluded.'. names them. A silently omitted assignment is a person left off the roster

**T-018** Cause: shortfall not acknowledged → expect `E_VALIDATION`, message: 'Confirm you have seen the gaps.'.

**T-019** Cause: the period contains a location outside the publisher's scope → expect `E_AUTHZ_SCOPE`, message: 'Not found.'.

**T-020** Cause: notification provider unavailable → expect `E_DEPENDENCY`. publication COMMITS and notifications are queued for retry. A schedule that fails to publish because a message could not be sent leaves the dispatcher believing it did not publish, and they will publish again

**T-021** Cause: the period contains more than max_assignments_per_publication → expect `E_QUOTA`, message: 'Plan limit reached.'. publication is split by scope rather than raised, because a single publication touching tens of thousands of people is a notification incident

## Edge cases

**T-022** (EC-01) Republishing after a small change. Every affected resource receives a CHANGE summary, not the whole roster, and resources with no change receive nothing at all. Sending an unchanged roster to two hundred people is how they learn to ignore roster notifications, after which the next real change is missed.

**T-023** (EC-02) A change published inside late_change_hours of the assignment's start. Permitted, flagged in the confirmation, counted per dispatcher and reported. Verity does not block late changes - operations require them - and it does make their frequency visible, because a roster changed at midnight every night is a management problem rather than a scheduling one.

**T-024** (EC-03) Publishing a period that overlaps an already-published period. The overlap is resolved by publishing a new version of the union, never two versions of overlapping ranges, because a resource holding two versions covering the same evening cannot tell which is current.

**T-025** (EC-04) A resource whose only assignment in the period is excluded. They are notified that they have no assignments in the period, not left with the previous version. Silence after a published roster is indistinguishable from an unchanged roster.

**T-026** (EC-05) Publishing when the notification port is unbound. Permitted, and the confirmation states plainly that nobody will be told and that resources must open the app. This is the most consequential unbound behaviour in the library and the confirmation is where it becomes visible to the person it affects.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
