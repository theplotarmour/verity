---
doc_id: TEST-APPLY_ESCALATION
title: Test catalogue — Apply an escalation
generated: true
source_model: _model/capabilities/lease_management.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Apply an escalation

*This document is generated. Edit `_model/capabilities/lease_management.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `apply_escalation` is invoked by an authorised actor, then the declared records are created/updated and events ['lease.escalation_applied'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `apply_escalation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `apply_escalation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `apply_escalation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `apply_escalation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `apply_escalation` succeeds. 

**T-007** As `ops_manager` (Operations / Area Manager), invoking `apply_escalation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `apply_escalation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `apply_escalation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `apply_escalation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `apply_escalation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `apply_escalation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `apply_escalation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `apply_escalation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `apply_escalation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `apply_escalation` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the reference index value is not published → expect `E_PRECONDITION`. the rule is HELD rather than estimated. Applying an estimate and correcting it later produces a charge, a credit and a conversation for every affected period

**T-018** Cause: requires_agreement is true and no agreed amount is recorded → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. a reviewed amount is a negotiated fact and the model never imposes one

**T-019** Cause: the computed increase falls outside the floor and cap → expect `E_VALIDATION`. clamped to the boundary and the clamping is recorded in the basis note, because a counterparty checking the arithmetic must be able to see why the number is not what the index alone would give

**T-020** Cause: a manual index value supplied without view_financial → expect `E_AUTHZ_FIELD`. refused. A manually entered index value sits at the base of every subsequent charge

**T-021** Cause: a manual index value with no source recorded → expect `E_VALIDATION`, message: 'Say where this figure came from.'. it is the input to every future charge and its provenance is what makes a dispute answerable

**T-022** Cause: the index source is unavailable → expect `E_DEPENDENCY`. held and retried, with the accrued difference reported so the cost of the delay is visible

## Edge cases

**T-023** (EC-01) An index value published and later revised. The escalation already applied is not recomputed automatically; the revision is reported to finance with the difference, and correcting it is a decision. Silently recomputing would change charges a counterparty has already paid.

**T-024** (EC-02) An escalation held for months and then applied from its original effective date. The difference for periods already charged is raised as a balancing charge rather than written off, and the counterparty receives the calculation for every affected period. Writing it off silently is a revenue decision nobody made.

**T-025** (EC-03) A stepped schedule where a step is missed because the rule was suspended. The next application applies the correct step for the current date rather than working through the missed ones, and the difference for the missed period is raised as a balancing charge with its own basis note. Applying steps in sequence after a gap would charge the wrong amount for the current period.

**T-026** (EC-04) An escalation whose effective date falls inside a rent-free period. The escalation applies to the underlying amount and the period remains rent-free, so the post-concession charge is correct. Applying it after the concession ends instead would understate every subsequent period.

**T-027** (EC-05) An escalation on a lease in holding over where the agreement is silent on the holding-over basis. Held, not applied, and reported. Escalating an amount that is itself an assumption compounds the assumption.

## Idempotency and concurrency

**T-028** Replaying the same request with the same idempotency key produces one effect and one event.

**T-029** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-030** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-031** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 31**
