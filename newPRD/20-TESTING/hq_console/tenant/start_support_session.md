---
doc_id: TEST-START_SUPPORT_SESSION
title: Test catalogue — Look at a tenant's workspace
generated: true
source_model: _model/capabilities/hq_console.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Look at a tenant's workspace

*This document is generated. Edit `_model/capabilities/hq_console.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `start_support_session` is invoked by an authorised actor, then the declared records are created/updated and events ['platform.support_session_started'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `start_support_session` succeeds. 

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `start_support_session` succeeds. 

**T-004** As `tenant_owner` (Owner / Director), invoking `start_support_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `start_support_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `start_support_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `start_support_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `start_support_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `start_support_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `start_support_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `start_support_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `start_support_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `start_support_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `start_support_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `start_support_session` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `start_support_session` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: no consent in force and no contract clause → expect `E_PRECONDITION`, message: 'This workspace has not permitted support access.'. consent is time-boxed and expires; there is no permanent value, so this is a condition support will meet regularly and must be able to resolve by asking

**T-018** Cause: ticket reference missing → expect `E_VALIDATION`, message: 'A ticket reference is required.'.

**T-019** Cause: the target holds tenant_owner and the operator is platform_support → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. impersonating an owner is restricted to the higher archetype because an owner sees everything

**T-020** Cause: operator session not elevated → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

**T-021** Cause: more than the daily support session limit → expect `E_RATE_LIMIT`, message: 'Too many attempts. Try again shortly.'. generous for genuine support work and tight enough that bulk browsing is visible

## Edge cases

**T-022** (EC-01) Permissions under support access are the INTERSECTION of the target's permissions and the operator's redaction profile. platform_support carries a redaction of every field marked financial, so support sees the layout and the workflow and not the numbers. This is enforced by core_authorization and is restated here because it is the property that makes the whole mechanism acceptable to a customer.

**T-023** (EC-02) Every action taken under support access appears in the TENANT's own audit stream with the operator and the ticket reference, not only in the platform's. Support access a customer cannot see in their own trail is indistinguishable from an intrusion, and the audit port contract carries this requirement rather than leaving it to be remembered.

**T-024** (EC-03) Elevation is structurally unavailable under support access, because elevation requires a credential the operator does not hold. High-risk actions are therefore impossible during support rather than merely forbidden by a rule somebody could misconfigure.

**T-025** (EC-04) Consent withdrawn during a live session. The session ends at the next request boundary rather than mid-action. Whether that is the right boundary is an open question carried from core_authorization and it is the same question, not a second one.

**T-026** (EC-05) A support session on a suspended tenant. Permitted, because the most common reason to look at a suspended tenant is to help them resolve the suspension, and refusing would make that impossible.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
