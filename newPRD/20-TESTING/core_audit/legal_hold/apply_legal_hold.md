---
doc_id: TEST-APPLY_LEGAL_HOLD
title: Test catalogue — Place a legal hold
generated: true
source_model: _model/capabilities/core_audit.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Place a legal hold

*This document is generated. Edit `_model/capabilities/core_audit.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `apply_legal_hold` is invoked by an authorised actor, then the declared records are created/updated and events ['legal_hold.applied'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `apply_legal_hold` succeeds. 

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `apply_legal_hold` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `apply_legal_hold` succeeds. 

**T-005** As `tenant_admin` (Tenant Administrator), invoking `apply_legal_hold` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `apply_legal_hold` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `apply_legal_hold` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `apply_legal_hold` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `apply_legal_hold` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `apply_legal_hold` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `apply_legal_hold` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `apply_legal_hold` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `apply_legal_hold` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `apply_legal_hold` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `apply_legal_hold` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `apply_legal_hold` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: scope_expression fails static analysis or exceeds the cost ceiling → expect `E_VALIDATION`, message: 'field-specific'. an unbounded hold expression that scans the entire history is refused at save time rather than timing out

**T-018** Cause: reference empty → expect `E_VALIDATION`, message: 'A matter reference is required.'.

**T-019** Cause: the hold would cover more than max_hold_rows → expect `E_QUOTA`, message: 'Plan limit reached.'. a hold over everything is a retention policy change, not a hold, and must be recognised as such

**T-020** Cause: session not elevated → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

## Edge cases

**T-021** (EC-01) A hold applied to rows that are already expired. Those rows cannot be recovered; the action succeeds for the rest and states plainly how many rows were already gone. Silently succeeding would let somebody believe evidence exists that does not.

**T-022** (EC-02) A hold whose scope expression matches rows written AFTER the hold was applied. Supported and is the normal case for an ongoing matter. The expression is evaluated at write time as well as at apply time, which means a hold makes every subsequent audit write slightly more expensive - a cost stated here rather than discovered in production.

**T-023** (EC-03) A hold applied by a principal who is themselves under investigation. Permitted to apply, forbidden to release. The asymmetry is deliberate.

**T-024** (EC-04) Interaction with a data-subject erasure request. A legal hold wins. The erasure request is recorded as received and as blocked, with the hold reference, so the obligation and the conflict are both documented rather than one silently overriding the other.

## Idempotency and concurrency

**T-025** Replaying the same request with the same idempotency key produces one effect and one event.

**T-026** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-027** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-028** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 28**
