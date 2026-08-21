---
doc_id: TEST-RAISE_BACKFILL_REQUEST
title: Test catalogue — Seek cover
generated: true
source_model: _model/capabilities/backfill_dispatch.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Seek cover

*This document is generated. Edit `_model/capabilities/backfill_dispatch.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `raise_backfill_request` is invoked by an authorised actor, then the declared records are created/updated and events ['backfill.requested'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `raise_backfill_request` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `raise_backfill_request` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `raise_backfill_request` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `raise_backfill_request` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `raise_backfill_request` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `raise_backfill_request` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `raise_backfill_request` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `raise_backfill_request` succeeds. 

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `raise_backfill_request` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `raise_backfill_request` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `raise_backfill_request` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `raise_backfill_request` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `raise_backfill_request` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `raise_backfill_request` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `raise_backfill_request` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the commitment window has already ended → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. the correct record is an unfilled outcome on the commitment itself, not a backfill nobody can fulfil

**T-018** Cause: no escalation policy covers this priority → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. names the missing policy. A backfill with no ladder is undefined after the first offer, so this is refused rather than defaulted

**T-019** Cause: a live request already exists for this commitment → expect `E_CONFLICT_UNIQUE`. returns the existing request with 200

**T-020** Cause: the resource provider is unavailable → expect `E_DEPENDENCY`, message: 'A required service is unavailable.'. the request is still CREATED in state raised, and the ranking retries. The gap exists whether or not the candidate service is reachable, and recording it is what makes the dispatcher aware

**T-021** Cause: the commitment is outside the raiser's scope → expect `E_AUTHZ_SCOPE`, message: 'Not found.'.

## Edge cases

**T-022** (EC-01) Raised for a commitment that was never covered in the first place. Legitimate and common - a roster published with a known gap. absent_resource_ref is null and cause is demand_increase or unknown, and the billing classification default differs from a decline-driven backfill, which is exactly why cause is a field rather than an inference.

**T-023** (EC-02) Two causes for one gap - somebody declined and then also reported an absence. One request, and the cause is the first one recorded, with the second appended to the narrative. Changing the cause afterwards would change the billing classification retroactively.

**T-024** (EC-03) Raised with less lead time than the fastest tier can complete. Accepted, the ladder compresses per the policy, and the request records that it started already compressed - so that an unfilled outcome can be read against what was actually possible rather than against the policy on paper.

**T-025** (EC-04) Raised automatically while the dispatcher is already handling the same gap manually. The idempotency key collapses them, and the dispatcher's manual offers are recorded against the same request through the spoken_by_dispatcher channel. Parallel manual and automatic searches are the most reliable way to double-staff a commitment.

## Idempotency and concurrency

**T-026** Replaying the same request with the same idempotency key produces one effect and one event.

**T-027** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-028** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-029** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 29**
