---
doc_id: TEST-ACCEPT_INVITATION
title: Test catalogue — Accept an invitation
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Accept an invitation

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `accept_invitation` is invoked by an authorised actor, then the declared records are created/updated and events ['principal.activated', 'membership.accepted', 'session.created'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `accept_invitation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `accept_invitation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `accept_invitation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `accept_invitation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `accept_invitation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `accept_invitation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `accept_invitation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `accept_invitation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `accept_invitation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `accept_invitation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `accept_invitation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `accept_invitation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `accept_invitation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `accept_invitation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `accept_invitation` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: token expired → expect `E_PRECONDITION`, message: 'This invitation has expired. Ask for a new one.'. the message deliberately does not say which workspace, because an expired-token page is unauthenticated

**T-018** Cause: token already used → expect `E_PRECONDITION`, message: 'This invitation has already been used.'.

**T-019** Cause: credential does not meet the tenant password policy → expect `E_VALIDATION`, message: 'field-specific'.

**T-020** Cause: tenant suspended between invite and accept → expect `E_TENANT_SUSPENDED`, message: 'This workspace is suspended.'.

**T-021** Cause: token guessing, 10 attempts per source IP per hour → expect `E_RATE_LIMIT`, message: 'Too many attempts.'.

## Edge cases

**T-022** (EC-01) Invitation accepted after the inviting tenant revoked the membership. Refused with E_PRECONDITION. The membership row, not the token, is the authority.

**T-023** (EC-02) A principal already active in another tenant accepts. No credential is set — they already have one. The flow is a consent screen naming the tenant, then the membership activates. Setting a second credential per tenant is explicitly not supported; identity is platform-level, membership is tenant-level.

**T-024** (EC-03) Acceptance from a device already blocked in that tenant. Refused with E_PRECONDITION, and the tenant_admin is notified, because an invitation being accepted on a blocked device is a signal worth surfacing.

## Idempotency and concurrency

**T-025** Replaying the same request with the same idempotency key produces one effect and one event.

**T-026** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-027** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-028** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 28**
