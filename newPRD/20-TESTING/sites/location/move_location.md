---
doc_id: TEST-MOVE_LOCATION
title: Test catalogue — Move a location in the hierarchy
generated: true
source_model: _model/capabilities/sites.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Move a location in the hierarchy

*This document is generated. Edit `_model/capabilities/sites.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `move_location` is invoked by an authorised actor, then the declared records are created/updated and events ['location.moved', 'org_structure.changed'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `move_location` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `move_location` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `move_location` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `move_location` succeeds. 

**T-006** As `finance` (Finance), invoking `move_location` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `move_location` succeeds. 

**T-008** As `supervisor` (Site Supervisor), invoking `move_location` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `move_location` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `move_location` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `move_location` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `move_location` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `move_location` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `move_location` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `move_location` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `move_location` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the new parent is inside the subtree being moved → expect `E_VALIDATION`, message: 'A location cannot be moved inside itself.'.

**T-018** Cause: the move would exceed the maximum hierarchy depth → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. names the depth limit

**T-019** Cause: subtree locked by another move → expect `E_PRECONDITION`, message: 'Another change to this part of the hierarchy is in progress.'.

**T-020** Cause: scope impact not acknowledged → expect `E_VALIDATION`, message: 'Confirm you have seen who gains and loses access.'.

**T-021** Cause: session not elevated → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

**T-022** Cause: the subtree exceeds max_move_subtree_size → expect `E_QUOTA`, message: 'Plan limit reached.'. a very large move is a migration and is scheduled rather than run while somebody waits, because path rematerialisation over a large subtree holds locks for a long time

## Edge cases

**T-023** (EC-01) A move that removes somebody's access to a location where they have work in progress today. Permitted, listed prominently in the confirmation, and the affected work is listed with its owner. Refusing would make reorganisation impossible; hiding it would strand somebody mid-task.

**T-024** (EC-02) A move performed while an offline device holds a cached scope. The device continues on its cached scope until it reconnects, bounded by offline_grace_hours. This is the same exposure as any permission change and is stated in the security model rather than pretended away.

**T-025** (EC-03) Moving a location to a parent in a different region changes which region its records roll up to for every past record as well, because roll-up is computed from the current hierarchy. Whether historical reports should follow the old hierarchy or the new one is a genuine reporting question and is flagged in open_questions rather than decided here.

## Idempotency and concurrency

**T-026** Replaying the same request with the same idempotency key produces one effect and one event.

**T-027** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-028** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-029** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 29**
