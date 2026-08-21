---
doc_id: TEST-ELEVATE_SESSION
title: Test catalogue — Step-up re-authentication
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Step-up re-authentication

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `elevate_session` is invoked by an authorised actor, then the declared records are created/updated and events ['session.elevated'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `elevate_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `elevate_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `elevate_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `elevate_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `elevate_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `elevate_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `elevate_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `elevate_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `elevate_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `elevate_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `elevate_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `elevate_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `elevate_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `elevate_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `elevate_session` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: re-authentication credential wrong → expect `E_AUTHN`, message: 'That is not correct.'. the session is NOT revoked on a failed elevation; the user keeps their normal-privilege session, because otherwise a shoulder-surfer could log a user out by failing an elevation

**T-018** Cause: 5 failed elevations in 15 min → expect `E_RATE_LIMIT`, message: 'Too many attempts. Try again shortly.'. the underlying session survives; only elevation is barred

**T-019** Cause: session already revoked → expect `E_PRECONDITION`, message: 'Session expired. Sign in again.'.

## Edge cases

**T-020** (EC-01) Elevation does not survive switch_tenant. A new session starts unelevated, because the risk of the elevated action is evaluated per tenant.

**T-021** (EC-02) An impersonating platform operator can never elevate on behalf of the impersonated principal. Elevation requires a credential and the operator does not hold the subject's credential. High-risk actions are therefore unavailable under impersonation by construction rather than by a permission rule that could be misconfigured.

**T-022** (EC-03) A geo-velocity step-down (see refresh_session) clears elevated_until immediately; it does not wait for the window to lapse.

## Idempotency and concurrency

**T-023** Replaying the same request with the same idempotency key produces one effect and one event.

**T-024** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-025** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-026** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 26**
