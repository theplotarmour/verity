---
doc_id: TEST-UNTRUST_DEVICE
title: Test catalogue — Withdraw trust from a device
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Withdraw trust from a device

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `untrust_device` is invoked by an authorised actor, then the declared records are created/updated and events ['device.untrusted'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `untrust_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `untrust_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `untrust_device` succeeds. 

**T-005** As `tenant_admin` (Tenant Administrator), invoking `untrust_device` succeeds. 

**T-006** As `finance` (Finance), invoking `untrust_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `untrust_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `untrust_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `untrust_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `untrust_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `untrust_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `untrust_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `untrust_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `untrust_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `untrust_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `untrust_device` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: device is not trusted → expect `E_PRECONDITION`, message: 'This device is not trusted.'.

**T-018** Cause: concurrent trust change → expect `E_CONFLICT_VERSION`, message: 'Someone else changed this record.'.

## Edge cases

**T-019** (EC-01) Existing sessions are NOT revoked. They are re-evaluated against the untrusted idle TTL at their next refresh, which may expire them within minutes. Revoking immediately would end a shift mid-task for a policy change that is usually routine hygiene.

**T-020** (EC-02) Automatic decay (device_trust_decay_days) uses this same action with actor=system_scheduler so that the audit trail is identical in shape to a human withdrawal and can be queried the same way.

## Idempotency and concurrency

**T-021** Replaying the same request with the same idempotency key produces one effect and one event.

**T-022** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-023** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-024** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 24**
