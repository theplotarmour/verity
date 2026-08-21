---
doc_id: TEST-REVOKE_BINDING
title: Test catalogue — Take away a role
generated: true
source_model: _model/capabilities/core_authorization.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Take away a role

*This document is generated. Edit `_model/capabilities/core_authorization.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `revoke_binding` is invoked by an authorised actor, then the declared records are created/updated and events ['binding.revoked'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `revoke_binding` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `revoke_binding` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `revoke_binding` succeeds. 

**T-005** As `tenant_admin` (Tenant Administrator), invoking `revoke_binding` succeeds. 

**T-006** As `finance` (Finance), invoking `revoke_binding` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `revoke_binding` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `revoke_binding` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `revoke_binding` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `revoke_binding` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `revoke_binding` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `revoke_binding` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `revoke_binding` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `revoke_binding` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `revoke_binding` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `revoke_binding` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: last binding conferring tenant_owner → expect `E_PRECONDITION`, message: 'This is the only owner of this workspace. Transfer ownership first.'.

**T-018** Cause: reason empty → expect `E_VALIDATION`, message: 'Give a reason. It is recorded and shown to the person.'.

**T-019** Cause: session not elevated → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

## Edge cases

**T-020** (EC-01) Revocation takes effect on the target's next request. Existing sessions are not revoked, because losing a role is not losing identity, and forcing a re-login for a routine permission change trains people to expect random logouts.

**T-021** (EC-02) In-flight approvals assigned to the revoked binding are reassigned per the approval_fallback policy and never silently stall. If no fallback resolves, the revocation still succeeds and the stalled approvals are listed to the tenant_admin, because blocking a revocation on a workflow is how a departing employee keeps access.

**T-022** (EC-03) Revoking a binding a person is actively using produces a specific message on their next action naming what changed and who changed it, not a generic denial. A permission that vanishes without explanation is indistinguishable from a bug and generates a support ticket every time.

**T-023** (EC-04) Revoking the binding of a principal who is currently being impersonated by platform_support. The impersonation session immediately loses the permission too, since impersonation is an intersection and never a union.

## Idempotency and concurrency

**T-024** Replaying the same request with the same idempotency key produces one effect and one event.

**T-025** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-026** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-027** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 27**
