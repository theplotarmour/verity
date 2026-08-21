---
doc_id: TEST-EXCLUDE_MEASUREMENT
title: Test catalogue — Exclude a measurement from performance
generated: true
source_model: _model/capabilities/sla_contract.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Exclude a measurement from performance

*This document is generated. Edit `_model/capabilities/sla_contract.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `exclude_measurement` is invoked by an authorised actor, then the declared records are created/updated and events ['sla.measurement_excluded'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `exclude_measurement` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `exclude_measurement` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `exclude_measurement` succeeds. 

**T-005** As `tenant_admin` (Tenant Administrator), invoking `exclude_measurement` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `exclude_measurement` succeeds. 

**T-007** As `ops_manager` (Operations / Area Manager), invoking `exclude_measurement` succeeds. 

**T-008** As `supervisor` (Site Supervisor), invoking `exclude_measurement` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `exclude_measurement` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `exclude_measurement` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `exclude_measurement` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `exclude_measurement` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `exclude_measurement` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `exclude_measurement` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `exclude_measurement` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `exclude_measurement` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: reason empty → expect `E_VALIDATION`, message: 'Give a reason. It is shown to finance and the contract owner.'.

**T-018** Cause: the measurement belongs to an applied penalty obligation → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. the correct path is a credit or an adjustment through billing, because the money has already moved and un-excluding it here would make the two systems disagree

**T-019** Cause: session not elevated → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

**T-020** Cause: the measurement is disputed → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. excluding a disputed measurement would resolve the dispute by removing its subject, which is not a resolution

## Edge cases

**T-021** (EC-01) Bulk exclusion of a whole day, for instance a site closure caused by the counterparty. Supported as a batch sharing one reason and one correlation_id, and it counts as many exclusions rather than one for the purposes of the rate alert - because the rate alert exists to make the volume visible and a batch would otherwise hide it.

**T-022** (EC-02) Excluding a measurement that is currently the only one in its period. The aggregation becomes undefined rather than perfect. A period with every measurement excluded reports as not measured, never as fully met, because a performance report of one hundred percent with nothing measured is the artefact this capability most needs to avoid producing.

**T-023** (EC-03) Exclusion by the principal whose own operation caused the breach. Permitted where they hold the role, and the notification names them. The control is that finance and the contract owner always see it, not that the operation is prevented from asking.

**T-024** (EC-04) A counterparty who can see performance through the surface noticing an exclusion. Exclusions are visible in the counterparty projection with their reason category, because a performance figure that silently improved is the fastest way to lose a contract argument.

## Idempotency and concurrency

**T-025** Replaying the same request with the same idempotency key produces one effect and one event.

**T-026** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-027** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-028** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 28**
