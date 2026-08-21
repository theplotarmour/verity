---
doc_id: TEST-REVOKE_MEMBERSHIP
title: Test catalogue — Remove a person from the workspace
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Remove a person from the workspace

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `revoke_membership` is invoked by an authorised actor, then the declared records are created/updated and events ['membership.revoked', 'session.revoked'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `revoke_membership` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `revoke_membership` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `revoke_membership` succeeds. 

**T-005** As `tenant_admin` (Tenant Administrator), invoking `revoke_membership` succeeds. 

**T-006** As `finance` (Finance), invoking `revoke_membership` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `revoke_membership` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `revoke_membership` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `revoke_membership` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `revoke_membership` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `revoke_membership` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `revoke_membership` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `revoke_membership` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `revoke_membership` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `revoke_membership` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `revoke_membership` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: target is the last active tenant_owner → expect `E_PRECONDITION`, message: 'This is the only owner of this workspace. Transfer ownership first.'.

**T-018** Cause: reason empty → expect `E_VALIDATION`, message: 'Give a reason. It is recorded and shown to the person.'.

**T-019** Cause: session not elevated → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

**T-020** Cause: the membership belongs to another tenant → expect `E_AUTHZ_SCOPE`, message: 'Not found.'.

## Edge cases

**T-021** (EC-01) LAST OWNER PROTECTION: refuse with E_PRECONDITION and name the constraint. Ownership transfer is a distinct action requiring the incoming owner to accept.

**T-022** (EC-02) Revoking a membership does NOT delete the persons operational history. Work orders they completed, attendance they recorded and invoices they raised remain, attributed to the now-revoked principal, displayed with a 'no longer active' marker.

**T-023** (EC-03) In-flight approvals assigned to the revoked principal are reassigned per the tenants approval_fallback policy (escalate to their manager by default) and never silently stall.

**T-024** (EC-04) Their shifts in the future roster are flagged as unstaffed and the dispatcher is notified. Verity never silently leaves a site unmanned.

**T-025** (EC-05) External client contacts: revoking access must not cancel their open tickets.

## Idempotency and concurrency

**T-026** Replaying the same request with the same idempotency key produces one effect and one event.

**T-027** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-028** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-029** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 29**
