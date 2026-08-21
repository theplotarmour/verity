---
doc_id: TEST-STAGE_CHANGE_SET
title: Test catalogue — Test a configuration change in staging
generated: true
source_model: _model/capabilities/core_configuration.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Test a configuration change in staging

*This document is generated. Edit `_model/capabilities/core_configuration.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `stage_change_set` is invoked by an authorised actor, then the declared records are created/updated and events ['change_set.staged'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `stage_change_set` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `stage_change_set` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `stage_change_set` succeeds. 

**T-005** As `tenant_admin` (Tenant Administrator), invoking `stage_change_set` succeeds. 

**T-006** As `finance` (Finance), invoking `stage_change_set` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `stage_change_set` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `stage_change_set` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `stage_change_set` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `stage_change_set` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `stage_change_set` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `stage_change_set` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `stage_change_set` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `stage_change_set` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `stage_change_set` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `stage_change_set` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: staging environment occupied → expect `E_PRECONDITION`, message: 'Another change is being tested. You can evict it, and they will be told.'. offers the action rather than only refusing, and names who will be told

**T-018** Cause: staging environment unavailable → expect `E_DEPENDENCY`, message: 'A required service is unavailable.'. the change set stays draft. It is NOT auto-promoted to production on a staging outage, which is the shortcut that eventually causes the incident staging exists to prevent

**T-019** Cause: a member change references an unknown or retired key → expect `E_VALIDATION`, message: 'field-specific'.

**T-020** Cause: more than max_changes_per_set members → expect `E_QUOTA`, message: 'Plan limit reached.'. a change set with two hundred members is a migration and cannot be meaningfully reviewed by a human, which is the entire purpose of the review step

## Edge cases

**T-021** (EC-01) The staging environment's data is a copy taken at an unstated moment. The acceptance run's meaning depends on how fresh that copy is, so the run result records the copy timestamp. A pass against three-month-old data is a weaker statement than it looks and the surface says so.

**T-022** (EC-02) A change set staged, then the underlying capability upgraded before it is applied. The set is invalidated and returns to draft with the reason, because its acceptance run tested a different system.

**T-023** (EC-03) Staging a set whose only members are immediate-impact. Permitted, and the surface offers the fast path instead, because forcing a branding colour change through staging is how a team learns to route around staging entirely.

## Idempotency and concurrency

**T-024** Replaying the same request with the same idempotency key produces one effect and one event.

**T-025** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-026** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-027** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 27**
