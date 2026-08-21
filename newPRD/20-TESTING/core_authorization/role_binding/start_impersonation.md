---
doc_id: TEST-START_IMPERSONATION
title: Test catalogue — Act as another principal
generated: true
source_model: _model/capabilities/core_authorization.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Act as another principal

*This document is generated. Edit `_model/capabilities/core_authorization.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `start_impersonation` is invoked by an authorised actor, then the declared records are created/updated and events ['impersonation.started'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `start_impersonation` succeeds. 

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `start_impersonation` succeeds. 

**T-004** As `tenant_owner` (Owner / Director), invoking `start_impersonation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `start_impersonation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `start_impersonation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `start_impersonation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `start_impersonation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `start_impersonation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `start_impersonation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `start_impersonation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `start_impersonation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `start_impersonation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `start_impersonation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `start_impersonation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `start_impersonation` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: no consent and no contract clause → expect `E_PRECONDITION`, message: 'This workspace has not permitted support access.'. consent is per tenant and time-boxed, and expires; a permanent consent is not offered

**T-018** Cause: ticket reference missing or malformed → expect `E_VALIDATION`, message: 'A ticket reference is required.'.

**T-019** Cause: target principal holds tenant_owner and the operator is platform_support rather than platform_operator → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. impersonating an owner is restricted to the higher archetype because an owner sees everything

**T-020** Cause: operator session not elevated → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

**T-021** Cause: more than impersonation_daily_limit sessions per operator per day → expect `E_RATE_LIMIT`, message: 'Too many attempts. Try again shortly.'. a limit that is generous for genuine support work and tight enough that bulk browsing is visible

## Edge cases

**T-022** (EC-01) Permissions under impersonation are the INTERSECTION of the target's permissions and the operator's own impersonation profile. platform_support carries a redaction of every field marked financial, so support sees the layout and the workflow without seeing the numbers. This is why impersonation is modelled here rather than in the identity capability - it is a permission construct.

**T-023** (EC-02) Every mutating action performed under impersonation is written to the audit with both principal ids and the ticket reference, and is additionally rendered in the tenant's own audit view with an unmistakable marker. A support action a customer cannot see in their own audit trail is indistinguishable from an intrusion.

**T-024** (EC-03) Elevation is unavailable under impersonation, because elevation requires a credential the operator does not hold. High-risk actions are therefore structurally impossible during support access rather than merely forbidden by a rule that could be misconfigured.

**T-025** (EC-04) The impersonation window lapses mid-action. The action in flight completes and the session then ends; there is no partial write. The operator is returned to their own console with a summary of what they did.

**T-026** (EC-05) The target principal is suspended during the impersonation. The impersonation ends immediately, because impersonating a principal who cannot themselves act would grant the operator authority the target does not have.

**T-027** (EC-06) Impersonation is never available for an integration_principal. There is no user experience to reproduce, so the only reason to impersonate a service account is to use its credentials, which is exactly what must not happen.

## Idempotency and concurrency

**T-028** Replaying the same request with the same idempotency key produces one effect and one event.

**T-029** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-030** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-031** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 31**
