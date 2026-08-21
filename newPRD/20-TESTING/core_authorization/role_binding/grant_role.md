---
doc_id: TEST-GRANT_ROLE
title: Test catalogue — Give someone a role
generated: true
source_model: _model/capabilities/core_authorization.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Give someone a role

*This document is generated. Edit `_model/capabilities/core_authorization.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `grant_role` is invoked by an authorised actor, then the declared records are created/updated and events ['binding.granted'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `grant_role` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `grant_role` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `grant_role` succeeds. 

**T-005** As `tenant_admin` (Tenant Administrator), invoking `grant_role` succeeds. 

**T-006** As `finance` (Finance), invoking `grant_role` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `grant_role` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `grant_role` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `grant_role` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `grant_role` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `grant_role` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `grant_role` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `grant_role` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `grant_role` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `grant_role` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `grant_role` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: a named scope value is outside the granter's own scope → expect `E_AUTHZ_SCOPE`, message: 'Not found.'. the location the granter cannot reach must not be confirmed to exist. The picker shows only reachable values and the server re-checks

**T-018** Cause: scope_bindings empty for a scope kind the role's grants require → expect `E_VALIDATION`, message: 'Choose at least one location for this role.'. names the specific scope kind. Granting a role that resolves to nothing is the most common new-administrator mistake and the error must teach rather than reject

**T-019** Cause: target principal has no active membership → expect `E_PRECONDITION`, message: 'This person is not in this workspace.'.

**T-020** Cause: role requires MFA and the target principal is not enrolled → expect `E_PRECONDITION`, message: 'This role requires two-factor authentication. Ask them to set it up first.'. the binding is created in a pending state rather than refused outright only if the tenant policy allows it; the shipped default refuses, because a privileged role held by an unprotected account is the exposure this rule exists to prevent

**T-021** Cause: the granter does not hold every verb the role grants → expect `E_AUTHZ_ENTITY`, message: 'You cannot grant access you do not have.'.

**T-022** Cause: session not elevated → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

## Edge cases

**T-023** (EC-01) Granting a role to oneself. Permitted for tenant_owner, refused for everyone else, and always flagged in the audit stream. A tenant_owner who cannot grant themselves a role cannot recover a workspace after an administrator leaves.

**T-024** (EC-02) A binding with expires_at set for cover during an absence. At expiry the permission cache is invalidated but live sessions are NOT revoked. The person keeps working and simply cannot perform the covered actions any more, receiving a specific message rather than a generic denial.

**T-025** (EC-03) Granting a role whose scope bindings reference locations that are later archived. The binding survives; the archived values resolve to nothing. This is reported in the access review rather than fixed automatically, because automatically widening a scope to compensate is an escalation.

**T-026** (EC-04) Two administrators granting different scope values of the same role concurrently. The union merge means both sets apply. This is deliberately permissive - the alternative, last-write-wins, silently discards one administrator's decision.

**T-027** (EC-05) Granting a role to an integration_principal. Permitted, but the binding may never carry a scope derived from a human relationship such as own_team, because a service account has no manager and the scope would resolve to the empty set forever. Refused at write time with a message naming the offending scope.

## Idempotency and concurrency

**T-028** Replaying the same request with the same idempotency key produces one effect and one event.

**T-029** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-030** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-031** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 31**
