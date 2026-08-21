---
doc_id: TEST-ROTATE_CREDENTIAL
title: Test catalogue — Rotate a credential
generated: true
source_model: _model/capabilities/integrations.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Rotate a credential

*This document is generated. Edit `_model/capabilities/integrations.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `rotate_credential` is invoked by an authorised actor, then the declared records are created/updated and events ['integration.credential_rotated'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `rotate_credential` succeeds. 

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `rotate_credential` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `rotate_credential` succeeds. 

**T-005** As `tenant_admin` (Tenant Administrator), invoking `rotate_credential` succeeds. 

**T-006** As `finance` (Finance), invoking `rotate_credential` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `rotate_credential` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `rotate_credential` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `rotate_credential` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `rotate_credential` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `rotate_credential` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `rotate_credential` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `rotate_credential` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `rotate_credential` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `rotate_credential` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `rotate_credential` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the secret store is unavailable → expect `E_DEPENDENCY`, message: 'A required service is unavailable.'. the rotation is refused and the existing credential remains. A half-completed rotation leaves a connection with a reference to a secret that may not exist

**T-018** Cause: the new credential fails a test call → expect `E_AUTHN`. the rotation is completed anyway where the operator accepts it explicitly, because some far sides only accept a credential after their own activation step, and refusing would make those integrations unrotatable

**T-019** Cause: session not elevated → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

**T-020** Cause: the connection is disabled → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'.

## Edge cases

**T-021** (EC-01) A rotation during active delivery. The overlap window is why in-flight messages do not fail. Without it a rotation drops whatever was mid-request, which for a delivery near its budget expiry means a dead letter caused by the rotation itself.

**T-022** (EC-02) A credential that expires with no rotation. The connection degrades and then suspends, messages queue rather than being lost, and the owner has been told at 30, 7 and 1 days. This is entirely preventable and the warning schedule exists because it is the most common failure this capability sees.

**T-023** (EC-03) Rotation of a credential the tenant does not control - one issued by the far side. Verity can only store what it is given; the model records the expiry and warns, and the act of obtaining a new one is outside the system. The warning is the whole value.

**T-024** (EC-04) A revoked credential still being presented by a far side that cached it. Rejected as an authentication failure and recorded, which is the correct outcome and is worth reporting rather than silently 401-ing, because it means the far side has stale configuration.

## Idempotency and concurrency

**T-025** Replaying the same request with the same idempotency key produces one effect and one event.

**T-026** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-027** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-028** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 28**
