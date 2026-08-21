---
doc_id: TEST-REAP_SESSION
title: Test catalogue — Reap an expired session
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Reap an expired session

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `reap_session` is invoked by an authorised actor, then the declared records are created/updated and events ['session.revoked'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `reap_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `reap_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `reap_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `reap_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `reap_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `reap_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `reap_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `reap_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `reap_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `reap_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `reap_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `reap_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `reap_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `reap_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `reap_session` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: sweep exceeds its time budget with rows remaining → expect `E_INTERNAL`. the sweep is resumable by cursor and never restarts from the beginning; a sweep that cannot finish within reaper_interval_minutes raises a platform alert per the idle_expired stuck-state policy

**T-018** Cause: event bus unavailable → expect `E_DEPENDENCY`. the revocation commits and the session.revoked event is queued in the transactional outbox; revocation must never be blocked on the availability of a notification path

## Edge cases

**T-019** (EC-01) A session that passed idle expiry and then absolute expiry before being swept is reaped with reason=absolute_timeout, the stronger of the two, so a support engineer reading the audit sees the binding constraint rather than the first one crossed.

**T-020** (EC-02) Reaping emits one session.revoked event per session. On a large tenant this can be thousands of events at a shift boundary; the event stream is the correct place for them and the notification layer must not fan them out to humans. Notifications on this action are deliberately empty.

**T-021** (EC-03) An impersonation session reaped by timeout also ends the impersonation. The impersonating operator's own HQ session is unaffected, and the audit shows the impersonation window closed by timeout rather than by the operator, which is the distinction a compliance review asks about.

## Idempotency and concurrency

**T-022** Replaying the same request with the same idempotency key produces one effect and one event.

**T-023** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-024** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-025** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 25**
