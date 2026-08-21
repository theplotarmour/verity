---
doc_id: TEST-REFRESH_SESSION
title: Test catalogue — Slide idle expiry
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Slide idle expiry

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `refresh_session` is invoked by an authorised actor, then the declared records are created/updated and events [] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `refresh_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `refresh_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `refresh_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `refresh_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `refresh_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `refresh_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `refresh_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `refresh_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `refresh_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `refresh_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `refresh_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `refresh_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `refresh_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `refresh_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `refresh_session` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: session already revoked, or now is past idle_expiry_at → expect `E_AUTHN`, message: 'Session expired. Sign in again.'. the session is marked revoked with reason=idle_timeout on this path rather than waiting for the reaper, so the reason is accurate at the moment it is observed

**T-018** Cause: now is past absolute_expiry_at → expect `E_AUTHN`, message: 'Session expired. Sign in again.'.

**T-019** Cause: the tenant was suspended after the session was issued → expect `E_TENANT_SUSPENDED`, message: 'This workspace is suspended.'. checked on refresh rather than only at sign-in, so a suspension takes effect within one refresh interval rather than within one session lifetime

**T-020** Cause: a client refreshing far more often than the idle window requires → expect `E_RATE_LIMIT`. silently throttled rather than surfaced. This is a client defect and the person holding the device can do nothing about it

## Edge cases

**T-021** (EC-01) Refresh arriving after idle_expiry_at but before absolute_expiry_at -> E_AUTHN, session revoked with reason=idle_timeout. No silent resurrection.

**T-022** (EC-02) {'Refresh from a different IP/geo than issue -> allowed by default (Indian mobile networks change IP constantly) but a geo jump exceeding tenant policy geo_velocity_kmh triggers step-down': 'session survives, elevated_until is cleared, and next high-risk action requires re-auth.'}

## Idempotency and concurrency

**T-023** Replaying the same request with the same idempotency key produces one effect and one event.

**T-024** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-025** An audit row of class `read_sensitive_only` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-026** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 26**
