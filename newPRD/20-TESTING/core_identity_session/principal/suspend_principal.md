---
doc_id: TEST-SUSPEND_PRINCIPAL
title: Test catalogue — Suspend a person's access
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Suspend a person's access

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `suspend_principal` is invoked by an authorised actor, then the declared records are created/updated and events ['principal.suspended', 'session.revoked'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `suspend_principal` succeeds. 

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `suspend_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `suspend_principal` succeeds. 

**T-005** As `tenant_admin` (Tenant Administrator), invoking `suspend_principal` succeeds. 

**T-006** As `finance` (Finance), invoking `suspend_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `suspend_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `suspend_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `suspend_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `suspend_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `suspend_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `suspend_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `suspend_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `suspend_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `suspend_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `suspend_principal` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: target is the last active tenant_owner → expect `E_PRECONDITION`, message: 'This is the only owner of this workspace. Transfer ownership first.'. the message names the constraint rather than saying access denied, because the administrator has the authority and just needs to do it in the right order

**T-018** Cause: reason empty → expect `E_VALIDATION`, message: 'Give a reason. It is recorded and shown to the person.'.

**T-019** Cause: acting session not elevated → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

**T-020** Cause: principal changed since the list was loaded → expect `E_CONFLICT_VERSION`, message: 'Someone else changed this record.'.

## Edge cases

**T-021** (EC-01) Suspension does not release the person's future assignments automatically. It flags them and tells the dispatcher, because auto-releasing a week of assignments on a suspension that is reversed the next morning creates more work than it saves. Whether it SHOULD auto-release is a configurable policy — see rules.

**T-022** (EC-02) Suspension while the person holds an in-flight approval. The approval is reassigned per approval_fallback. A suspension that silently parks an approval is how a purchase order sits for three weeks.

**T-023** (EC-03) Suspending a principal who holds memberships in several tenants. Suspension is platform-level on the principal row and therefore affects every tenant. A tenant_admin may only suspend a principal whose memberships are entirely within their tenant; otherwise they may only suspend_membership. This asymmetry is deliberate and is enforced server-side, because one tenant must never be able to cut off another tenant's staff.

**T-024** (EC-04) {'Suspending oneself. Permitted but requires typing the word to confirm, and warns that reinstatement will require another administrator. Forbidding it entirely creates a worse failure': 'a compromised administrator who cannot lock themselves out.'}

## Idempotency and concurrency

**T-025** Replaying the same request with the same idempotency key produces one effect and one event.

**T-026** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-027** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-028** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 28**
