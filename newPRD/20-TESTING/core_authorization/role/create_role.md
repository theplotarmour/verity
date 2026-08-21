---
doc_id: TEST-CREATE_ROLE
title: Test catalogue — Create a role
generated: true
source_model: _model/capabilities/core_authorization.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Create a role

*This document is generated. Edit `_model/capabilities/core_authorization.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `create_role` is invoked by an authorised actor, then the declared records are created/updated and events ['role.created'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `create_role` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `create_role` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `create_role` succeeds. 

**T-005** As `tenant_admin` (Tenant Administrator), invoking `create_role` succeeds. 

**T-006** As `finance` (Finance), invoking `create_role` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `create_role` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `create_role` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `create_role` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `create_role` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `create_role` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `create_role` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `create_role` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `create_role` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `create_role` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `create_role` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: key already exists with different content → expect `E_CONFLICT_UNIQUE`, message: 'A role with this key already exists.'.

**T-018** Cause: archetypes empty or contains an unknown archetype → expect `E_VALIDATION`, message: 'field-specific'.

**T-019** Cause: the creator names an archetype they do not themselves hold → expect `E_AUTHZ_FIELD`. the archetype picker is projected to what the creator holds, and the server re-checks. This is the primary privilege-escalation path in any role system and it is closed at write time rather than at bind time

**T-020** Cause: session not elevated → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

**T-021** Cause: tenant role count limit reached → expect `E_QUOTA`, message: 'Plan limit reached.'. the limit exists because role explosion is the failure mode this model is designed to avoid, and an unbounded count is evidence it is happening

## Edge cases

**T-022** (EC-01) Cloning a system role copies its grants and clears is_system. The clone records which system role and which capability version it was cloned from, so that when the system role gains a grant in a later version the clone can be reported as diverged rather than silently left behind.

**T-023** (EC-02) A role created while a capability is disabled may reference entities that are not currently in the manifest. This is permitted and the role stays in draft; publish_role is what enforces manifest consistency. Refusing at creation would make staging a pack impossible.

## Idempotency and concurrency

**T-024** Replaying the same request with the same idempotency key produces one effect and one event.

**T-025** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-026** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-027** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 27**
