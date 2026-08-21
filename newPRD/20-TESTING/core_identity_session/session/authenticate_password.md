---
doc_id: TEST-AUTHENTICATE_PASSWORD
title: Test catalogue — Sign in with email and password
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Sign in with email and password

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `authenticate_password` is invoked by an authorised actor, then the declared records are created/updated and events ['session.created', 'principal.authenticated'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `authenticate_password` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `authenticate_password` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `authenticate_password` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `authenticate_password` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `authenticate_password` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `authenticate_password` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `authenticate_password` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `authenticate_password` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `authenticate_password` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `authenticate_password` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `authenticate_password` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `authenticate_password` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `authenticate_password` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `authenticate_password` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `authenticate_password` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: malformed email → expect `E_VALIDATION`, message: 'Enter a valid email address.'.

**T-018** Cause: wrong password OR unknown email → expect `E_AUTHN`, message: 'Email or password is incorrect.'. identical message and identical response timing for both cases, constant-time compare, to prevent account enumeration

**T-019** Cause: principal.status=suspended → expect `E_AUTHN`, message: 'This account is suspended. Contact your administrator.'.

**T-020** Cause: principal.status=deactivated → expect `E_AUTHN`, message: 'Email or password is incorrect.'. deliberately indistinguishable from unknown account

**T-021** Cause: 5 failures in 15 min per principal → expect `E_RATE_LIMIT`, message: 'Too many attempts. Try again in 15 minutes.'. lock is per principal AND separately per source IP, so an attacker cannot lock a victim out cheaply — IP limit is 20/15min

**T-022** Cause: tenant billing suspension → expect `E_TENANT_SUSPENDED`, message: 'This workspace is suspended.'.

**T-023** Cause: device blocked → expect `E_PRECONDITION`, message: 'This device is not permitted. Contact your administrator.'.

## Edge cases

**T-024** (EC-01) Correct password but MFA enrolled -> session is NOT created. A short-lived mfa_challenge token is returned instead. The session row is created only after MFA success.

**T-025** (EC-02) Principal has zero active tenant memberships -> authentication succeeds, no session is minted, user lands on a "no workspaces" screen with a support link. This is not an error state.

**T-026** (EC-03) Principal has multiple active memberships and no tenant_hint -> tenant picker. Session minted only after choice.

**T-027** (EC-04) Password correct but expired per tenant password_max_age policy -> forced change flow, session minted only after change, all other sessions revoked with reason=password_change.

**T-028** (EC-05) Clock skew on the device does not affect expiry; expiry is evaluated server-side only.

**T-029** (EC-06) Sign-in during an in-progress offline sync on the same device by a DIFFERENT principal -> blocked with E_PRECONDITION until the queue drains or the outgoing user explicitly discards, because queued mutations are attributed to the queueing principal and must not be replayed under a new identity.

## Idempotency and concurrency

**T-030** Replaying the same request with the same idempotency key produces one effect and one event.

**T-031** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-032** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-033** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 33**
