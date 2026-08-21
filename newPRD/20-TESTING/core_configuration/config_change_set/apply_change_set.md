---
doc_id: TEST-APPLY_CHANGE_SET
title: Test catalogue — Apply a configuration change
generated: true
source_model: _model/capabilities/core_configuration.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Apply a configuration change

*This document is generated. Edit `_model/capabilities/core_configuration.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `apply_change_set` is invoked by an authorised actor, then the declared records are created/updated and events ['change_set.applied', 'config.changed per member'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `apply_change_set` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `apply_change_set` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `apply_change_set` succeeds. 

**T-005** As `tenant_admin` (Tenant Administrator), invoking `apply_change_set` succeeds. 

**T-006** As `finance` (Finance), invoking `apply_change_set` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `apply_change_set` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `apply_change_set` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `apply_change_set` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `apply_change_set` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `apply_change_set` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `apply_change_set` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `apply_change_set` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `apply_change_set` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `apply_change_set` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `apply_change_set` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: approval expired → expect `E_PRECONDITION`, message: 'This was approved more than N days ago. It needs approving again.'.

**T-018** Cause: staging run never completed → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'.

**T-019** Cause: a member key changed since the set was staged → expect `E_CONFLICT_VERSION`, message: 'Someone else changed this record.'. names the specific keys that moved, so the administrator can decide whether their change is still the right one

**T-020** Cause: session not elevated → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

**T-021** Cause: the transaction fails partway → expect `E_INTERNAL`, message: 'Something went wrong. The team has been notified.'. the whole set rolls back. A half-applied configuration is a state nobody designed

## Edge cases

**T-022** (EC-01) Applying a set that changes a setting a running workflow depends on. Running workflow instances continue on the definition version they started with; the composition model is explicit that a workflow change is a new version and never an edit to a running instance. The same principle is applied to configuration a workflow reads.

**T-023** (EC-02) Applying a rollback change set. It is an ordinary change set whose members restore previous values, with rollback_of_change_set_id set for narrative. It is not privileged and it goes through the same path, because a rollback applied without testing is how one incident becomes two.

**T-024** (EC-03) Post-deploy reconciliation finds drift. Reported as an alert naming the key, the expected value and the observed behaviour. Never auto-corrected, because auto-correcting drift can mean overwriting an emergency manual intervention somebody made at 3am.

## Idempotency and concurrency

**T-025** Replaying the same request with the same idempotency key produces one effect and one event.

**T-026** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-027** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-028** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 28**
