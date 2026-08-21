---
doc_id: TEST-RECORD_READING
title: Test catalogue — Record a meter reading
generated: true
source_model: _model/capabilities/assets.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Record a meter reading

*This document is generated. Edit `_model/capabilities/assets.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `record_reading` is invoked by an authorised actor, then the declared records are created/updated and events ['asset.reading_recorded', 'asset.reading_implausible'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `record_reading` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `record_reading` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `record_reading` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `record_reading` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `record_reading` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `record_reading` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `record_reading` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `record_reading` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `record_reading` succeeds. 

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `record_reading` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `record_reading` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `record_reading` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `record_reading` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `record_reading` succeeds. 

## Tenant isolation

**T-016** A principal in tenant A invoking `record_reading` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the meter key is not defined on the asset's class → expect `E_VALIDATION`, message: 'This asset does not have that meter.'. names the meters it does have

**T-018** Cause: unit does not match the meter definition → expect `E_VALIDATION`, message: 'field-specific'. refused rather than converted. An assumed conversion between hours and kilometres is not a rounding error, it is a different quantity

**T-019** Cause: a negative value on a cumulative meter → expect `E_VALIDATION`, message: 'field-specific'.

**T-020** Cause: the value is lower than the previous reading on a cumulative meter → expect `E_PRECONDITION`. ACCEPTED and marked went_backwards. Counters are replaced, roll over and are misread, and rejecting the reading means the true current value never gets recorded at all

**T-021** Cause: the delta exceeds the plausibility threshold for the meter → expect `E_PRECONDITION`. accepted and marked implausible_jump. A transposed digit and a genuinely heavy month look identical to a threshold and only a person can tell them apart

**T-022** Cause: the asset is disposed → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'.

## Edge cases

**T-023** (EC-01) A replaced counter reading from zero. Recorded as went_backwards and resolved by a rollover_correction reading that records the retired counter's final value and the new counter's start, so cumulative usage across the replacement remains derivable. Without this the asset's lifetime usage resets and every usage-based plan and depreciation figure silently restarts.

**T-024** (EC-02) An estimated reading because the asset could not be reached. Recorded with source=estimated. Plans still compute from it and every downstream artefact carries the estimation through, so a maintenance record built on estimates is visibly built on estimates.

**T-025** (EC-03) A reading entered days after it was taken. read_at and recorded_at are both retained, plans compute from read_at, and the gap is visible. Computing from recorded_at would push every due date later by however long the paperwork took.

**T-026** (EC-04) Two readings for one asset arriving out of order from an offline device. Both are stored, the series is ordered by read_at, and each carries the plausibility assessment made at its own write time. The frozen assessment matters because a technician may already have been dispatched on the strength of it.

**T-027** (EC-05) A reading that triggers a plan whose demand is already open. The plan generates one demand, not two, because generation is idempotent per plan per due point. Duplicate maintenance work orders are the classic failure of meter-driven maintenance.

## Idempotency and concurrency

**T-028** Replaying the same request with the same idempotency key produces one effect and one event.

**T-029** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-030** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-031** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 31**
