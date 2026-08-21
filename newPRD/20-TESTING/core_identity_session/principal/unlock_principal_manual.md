---
doc_id: TEST-UNLOCK_PRINCIPAL_MANUAL
title: Test catalogue — Unlock an account before the lockout lapses
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Unlock an account before the lockout lapses

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `unlock_principal_manual` is invoked by an authorised actor, then the declared records are created/updated and events ['principal.unlocked'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `unlock_principal_manual` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `unlock_principal_manual` succeeds. 

**T-004** As `tenant_owner` (Owner / Director), invoking `unlock_principal_manual` succeeds. 

**T-005** As `tenant_admin` (Tenant Administrator), invoking `unlock_principal_manual` succeeds. 

**T-006** As `finance` (Finance), invoking `unlock_principal_manual` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `unlock_principal_manual` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `unlock_principal_manual` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `unlock_principal_manual` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `unlock_principal_manual` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `unlock_principal_manual` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `unlock_principal_manual` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `unlock_principal_manual` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `unlock_principal_manual` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `unlock_principal_manual` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `unlock_principal_manual` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: principal is not locked → expect `E_PRECONDITION`, message: 'This account is not locked.'.

**T-018** Cause: not elevated → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

**T-019** Cause: the same principal unlocked more than repeat_lockout_threshold times in 24h → expect `E_RATE_LIMIT`, message: 'This account keeps locking. Check for a device with a saved wrong password before unlocking again.'. the limit is advisory and overridable by tenant_owner, because an operations manager at 6am must not be blocked by a rate limit from restoring a shift

## Edge cases

**T-020** (EC-01) Unlocking does not reset MFA or clear a suspension. Those are distinct states and distinct actions. An administrator who expects unlock to fix everything is shown which other conditions still block sign-in.

**T-021** (EC-02) Platform_support may unlock but may not suspend, deactivate or change credentials. Read-biased support with exactly one write is deliberate; it is the single most requested support action and routing it through a tenant administrator at 3am is how support tickets become outages.

## Idempotency and concurrency

**T-022** Replaying the same request with the same idempotency key produces one effect and one event.

**T-023** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-024** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-025** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 25**
