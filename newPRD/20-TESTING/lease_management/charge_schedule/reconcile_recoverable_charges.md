---
doc_id: TEST-RECONCILE_RECOVERABLE_CHARGES
title: Test catalogue — Reconcile estimated recoverable charges against actual cost
generated: true
source_model: _model/capabilities/lease_management.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Reconcile estimated recoverable charges against actual cost

*This document is generated. Edit `_model/capabilities/lease_management.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `reconcile_recoverable_charges` is invoked by an authorised actor, then the declared records are created/updated and events ['lease.recoverables_reconciled'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `reconcile_recoverable_charges` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `reconcile_recoverable_charges` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `reconcile_recoverable_charges` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `reconcile_recoverable_charges` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `reconcile_recoverable_charges` succeeds. 

**T-007** As `ops_manager` (Operations / Area Manager), invoking `reconcile_recoverable_charges` succeeds. 

**T-008** As `supervisor` (Site Supervisor), invoking `reconcile_recoverable_charges` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `reconcile_recoverable_charges` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `reconcile_recoverable_charges` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `reconcile_recoverable_charges` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `reconcile_recoverable_charges` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `reconcile_recoverable_charges` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `reconcile_recoverable_charges` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `reconcile_recoverable_charges` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `reconcile_recoverable_charges` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: no apportionment basis recorded → expect `E_VALIDATION`, message: 'Say how the cost is divided.'. never defaulted to area. The basis is the single most disputed element of a recoverable charge and an assumed one is indefensible

**T-018** Cause: the apportioned shares do not sum to the reconcilable total → expect `E_VALIDATION`, message: 'field-specific'. refused. Shares that do not sum are the first thing an adviser checks and the fastest way to lose the argument

**T-019** Cause: a cost line has no supporting evidence where the agreement requires it → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. names the lines. A recoverable cost a counterparty cannot inspect is one they will refuse

**T-020** Cause: cost lines supplied without view_financial → expect `E_AUTHZ_FIELD`. refused

**T-021** Cause: the period is outside the agreement's reconciliation deadline → expect `E_PRECONDITION`. permitted with an explicit acknowledgement, because a late reconciliation may be unrecoverable under the agreement and that is a commercial decision rather than a validation failure

## Edge cases

**T-022** (EC-01) A lease that started or ended mid-period. Its share is apportioned by occupation time as well as by the apportionment basis, and both apportionments are shown in the breakdown. Showing only the final figure guarantees a query.

**T-023** (EC-02) A cost the agreement excludes. Excluded explicitly with the exclusion recorded and shown in the breakdown as excluded rather than omitted. An omitted cost looks like an oversight and invites a request for the full ledger.

**T-024** (EC-03) A reconciliation producing a credit rather than a charge. Handled identically and issued as a credit through billing. Deferring a credit while charges are issued promptly is noticed, and it is noticed by exactly the counterparties who read their statements.

**T-025** (EC-04) A cost pool shared with spaces that are vacant. The vacant share is borne by the tenant of Verity rather than redistributed to occupiers, unless the agreement provides otherwise, and which of the two applied is stated in the breakdown. Silently redistributing a vacancy cost is one of the most common grounds for a successful challenge.

**T-026** (EC-05) Reconciliation where the estimate was never charged because the schedule stalled. The reconciliation reveals it, and the missing estimate periods are raised alongside the balancing charge with their own basis notes rather than being folded into one unexplained figure.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
