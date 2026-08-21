---
doc_id: TEST-REINSTATE_PRINCIPAL
title: Test catalogue — Reinstate a suspended person
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Reinstate a suspended person

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `reinstate_principal` is invoked by an authorised actor, then the declared records are created/updated and events ['principal.reinstated'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `reinstate_principal` succeeds. 

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `reinstate_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `reinstate_principal` succeeds. 

**T-005** As `tenant_admin` (Tenant Administrator), invoking `reinstate_principal` succeeds. 

**T-006** As `finance` (Finance), invoking `reinstate_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `reinstate_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `reinstate_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `reinstate_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `reinstate_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `reinstate_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `reinstate_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `reinstate_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `reinstate_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `reinstate_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `reinstate_principal` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: principal is deactivated, not suspended → expect `E_PRECONDITION`, message: 'This account is closed and cannot be reopened.'. deactivation is deliberately not reversible here; see open_questions on rehire

**T-018** Cause: not elevated → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

**T-019** Cause: seat quota was consumed while the person was suspended → expect `E_QUOTA`, message: 'Plan limit reached.'. this is why suspended memberships count against the quota — so reinstatement can never fail for a reason the administrator could not see coming

## Edge cases

**T-020** (EC-01) No sessions are restored. Reinstatement grants the right to authenticate, not a live session, and the revoked rows stay revoked.

**T-021** (EC-02) Reinstating a principal whose tenant_membership was separately revoked leaves them with no landing place. The action succeeds and warns explicitly, naming the memberships that would also need restoring, rather than silently producing an account that can sign in and see nothing.

## Idempotency and concurrency

**T-022** Replaying the same request with the same idempotency key produces one effect and one event.

**T-023** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-024** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-025** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 25**
