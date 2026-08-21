---
doc_id: TEST-AGREE_LEASE
title: Test catalogue — Agree a lease
generated: true
source_model: _model/capabilities/lease_management.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Agree a lease

*This document is generated. Edit `_model/capabilities/lease_management.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `agree_lease` is invoked by an authorised actor, then the declared records are created/updated and events ['lease.agreed'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `agree_lease` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `agree_lease` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `agree_lease` succeeds. 

**T-005** As `tenant_admin` (Tenant Administrator), invoking `agree_lease` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `agree_lease` succeeds. 

**T-007** As `ops_manager` (Operations / Area Manager), invoking `agree_lease` succeeds. 

**T-008** As `supervisor` (Site Supervisor), invoking `agree_lease` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `agree_lease` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `agree_lease` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `agree_lease` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `agree_lease` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `agree_lease` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `agree_lease` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `agree_lease` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `agree_lease` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: a space is already let over overlapping dates → expect `E_CONFLICT_UNIQUE`, message: 'This space is already let for part of that period.'. names the other lease and the overlapping dates. Double-letting is discovered by two counterparties arriving at the same place

**T-018** Cause: a per-area charge with no area basis stated → expect `E_VALIDATION`, message: 'Say which measurement the rent is based on.'. never defaulted. Different bases give materially different numbers for the same space

**T-019** Cause: automatic renewal with no window or notice period → expect `E_VALIDATION`, message: 'field-specific'. an automatic renewal with no window is a commitment nobody can escape

**T-020** Cause: financial terms supplied without view_financial → expect `E_AUTHZ_FIELD`. refused rather than dropped, because the financial terms ARE the lease

**T-021** Cause: session not elevated → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

**T-022** Cause: the space provider is unavailable → expect `E_DEPENDENCY`, message: 'A required service is unavailable.'. refused. Agreeing a lease without being able to check for an overlap is how a space is let twice

**T-023** Cause: the term would generate more than max_schedule_rows → expect `E_QUOTA`, message: 'Plan limit reached.'. a very long term at a short frequency; the correct action is to generate the schedule in horizons rather than raising the limit, and the message says so

## Edge cases

**T-024** (EC-01) A lease over several spaces with different area bases. Each space carries its own measurement and the lease records which basis the rent is calculated on. Averaging them would produce a rate neither party recognises.

**T-025** (EC-02) Rent-free periods at the start of a term. Schedule rows are generated for those periods with amount zero and rent_free true, rather than being omitted. An omitted period is indistinguishable from a scheduler failure, and the counterparty's own statement should show the concession rather than a gap.

**T-026** (EC-03) A lease agreed after occupation has already begun, which is common. Permitted, and the schedule is generated from starts_on, so early periods raise immediately on activation. The gap between starts_on and the agreement date is retained and visible, because it is frequently the subject of a later question.

**T-027** (EC-04) A term long enough that generating the whole schedule is impractical. Generated in horizons with the horizon recorded, and the same materialisation-lag monitor applies as in scheduling - a schedule that has silently stopped generating is rent that is silently not charged.

**T-028** (EC-05) An open market review scheduled during the term. The escalation rule is created with requires_agreement true and nothing is computed. The obligation to negotiate is raised when it falls due, and until it is agreed the charges continue at the old amount with the accrued difference visible.

## Idempotency and concurrency

**T-029** Replaying the same request with the same idempotency key produces one effect and one event.

**T-030** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-031** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-032** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 32**
