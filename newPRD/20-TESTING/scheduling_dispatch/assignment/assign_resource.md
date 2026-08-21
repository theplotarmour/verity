---
doc_id: TEST-ASSIGN_RESOURCE
title: Test catalogue — Assign a resource to a demand
generated: true
source_model: _model/capabilities/scheduling_dispatch.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Assign a resource to a demand

*This document is generated. Edit `_model/capabilities/scheduling_dispatch.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `assign_resource` is invoked by an authorised actor, then the declared records are created/updated and events ['assignment.created', 'demand.coverage_changed'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `assign_resource` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `assign_resource` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `assign_resource` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `assign_resource` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `assign_resource` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `assign_resource` succeeds. 

**T-008** As `supervisor` (Site Supervisor), invoking `assign_resource` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `assign_resource` succeeds. 

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `assign_resource` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `assign_resource` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `assign_resource` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `assign_resource` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `assign_resource` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `assign_resource` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `assign_resource` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the resource already has an overlapping assignment → expect `E_CONFLICT_UNIQUE`, message: 'This person is already assigned at that time.'. names the other assignment and its location, because the dispatcher's next question is always where

**T-018** Cause: the resource is reported unavailable → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. the message carries the single reason CODE from the resource provider, resolved to a human phrase locally. It never carries the provider's reason text, which may be sensitive

**T-019** Cause: a required qualification is missing or expired → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. names the qualification, which is not sensitive, unlike an absence reason

**T-020** Cause: a working-hour limit would be breached → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. names the specific limit and the resulting total. A limit refusal that does not say by how much is a refusal the dispatcher will route around

**T-021** Cause: assignment window falls outside the demand window and the demand is not flexible → expect `E_VALIDATION`, message: 'This does not fit the requested time.'.

**T-022** Cause: assigned_by is optimiser and assignment_reason is empty → expect `E_VALIDATION`. an unexplained automatic assignment is refused at write time rather than being allowed to erode trust in the optimiser

**T-023** Cause: cost_estimate would breach the demand's cost ceiling → expect `E_QUOTA`, message: 'Plan limit reached.'. routed through the approval_chain port where bound, refused with the ceiling named where not

**T-024** Cause: the demand changed since the dispatch screen loaded → expect `E_CONFLICT_VERSION`, message: 'Someone else changed this record.'.

## Edge cases

**T-025** (EC-01) Assigning across the location's day boundary. The assignment is one record spanning the boundary; attribution to operating days is computed by the location_calendar port and is recorded on the assignment rather than derived later, so that a calendar change cannot retroactively move somebody's hours between days.

**T-026** (EC-02) Assigning a resource whose availability window ends mid-assignment. Refused. Partial availability produces a partial assignment only if the demand's required_count and window permit splitting, and splitting is always an explicit act rather than an automatic one.

**T-027** (EC-03) Assignment created before the demand is published to the resource. Normal - creation and publication are separate, and this is what makes a draft roster possible.

**T-028** (EC-04) Two demands at the same location in the same window each needing the same single resource. Both cannot be covered. The engine does not silently prefer one; it reports the contention with both priorities and the dispatcher chooses. Automatic priority resolution is offered as configuration and is off by default, because the first time it silently drops an urgent demand nobody will trust it again.

**T-029** (EC-05) An override used to assign an unavailable resource. Permitted for a dispatcher only where the tenant enables it, always requires a reason, is reported to ops_manager and is counted. A rising override count is the signal that the availability data is wrong, which is more useful than blocking the override and having the dispatcher work around the system entirely.

## Idempotency and concurrency

**T-030** Replaying the same request with the same idempotency key produces one effect and one event.

**T-031** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-032** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-033** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 33**
