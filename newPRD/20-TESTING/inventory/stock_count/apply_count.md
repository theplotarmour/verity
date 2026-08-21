---
doc_id: TEST-APPLY_COUNT
title: Test catalogue — Apply a stock count
generated: true
source_model: _model/capabilities/inventory.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Apply a stock count

*This document is generated. Edit `_model/capabilities/inventory.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `apply_count` is invoked by an authorised actor, then the declared records are created/updated and events ['stock.count_applied', 'stock.variance_recorded'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `apply_count` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `apply_count` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `apply_count` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `apply_count` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `apply_count` succeeds. 

**T-007** As `ops_manager` (Operations / Area Manager), invoking `apply_count` succeeds. 

**T-008** As `supervisor` (Site Supervisor), invoking `apply_count` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `apply_count` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `apply_count` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `apply_count` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `apply_count` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `apply_count` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `apply_count` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `apply_count` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `apply_count` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: a variance line above the threshold has no reason → expect `E_PRECONDITION`, message: 'Give a reason for the differences.'. names the lines

**T-018** Cause: the applier is the counter and review is required → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. a person confirming their own count is a count with one opinion in it

**T-019** Cause: variance value exceeds the elevation threshold and the session is not elevated → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

**T-020** Cause: movements occurred that the movement-since calculation cannot resolve, for example a reversal of a pre-snapshot movement → expect `E_CONFLICT_VERSION`, message: 'Someone else changed this record.'. the count returns to under_review with the conflicting movements named, because silently absorbing them into the variance attributes somebody else's correction to the counter

**T-021** Cause: the count is already applied → expect `E_PRECONDITION`. 2xx no-op

## Edge cases

**T-022** (EC-01) A count applied long after it was taken. The movement-since calculation grows and the variance becomes dominated by activity rather than by what was found. Beyond count_stale_hours the application is refused and a recount is required, because at that point the count is measuring the wrong thing.

**T-023** (EC-02) A blind count where the counter recorded zero for an item they simply did not look at. This is why not-found is a distinct answer from zero. Conflating them writes off the entire balance of every item the counter walked past.

**T-024** (EC-03) A variance in the same direction at the same location across consecutive counts. Applied normally and reported as a systematic pattern, because a consistent direction is shrinkage or a consistent process error, and a one-off variance is neither.

**T-025** (EC-04) Applying a count that includes items with open reservations. Reservations are untouched. A count measures on-hand, and adjusting reservations to fit a count would silently break commitments made to other capabilities.

**T-026** (EC-05) A count applied while a device is still holding unsynced consumption for that location. The unsynced movements arrive afterwards with earlier occurred_at values and would make the corrected balance wrong. The count application records the last-known sync position of every device holding stock for that location, and where any is behind, the application warns and names them. This is the only place a stock count and offline capture genuinely conflict, and it cannot be solved by the model alone.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
