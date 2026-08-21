---
doc_id: TEST-RECORD_MOVEMENT
title: Test catalogue — Record a stock movement
generated: true
source_model: _model/capabilities/inventory.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Record a stock movement

*This document is generated. Edit `_model/capabilities/inventory.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `record_movement` is invoked by an authorised actor, then the declared records are created/updated and events ['stock.moved', 'stock.balance_changed', 'stock.went_negative'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `record_movement` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `record_movement` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `record_movement` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `record_movement` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `record_movement` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `record_movement` succeeds. 

**T-008** As `supervisor` (Site Supervisor), invoking `record_movement` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `record_movement` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `record_movement` succeeds. 

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `record_movement` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `record_movement` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `record_movement` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `record_movement` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `record_movement` succeeds. 

## Tenant isolation

**T-016** A principal in tenant A invoking `record_movement` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: no reason key, or a reason key not valid for this movement kind → expect `E_VALIDATION`, message: 'Choose a reason.'. mandatory on every kind. An unreasoned adjustment is where inconvenient truth is hidden, and the closed list is what makes the adjustment report readable

**T-018** Cause: unit of measure does not match and no conversion factor is declared → expect `E_VALIDATION`, message: 'This is measured in a different unit.'. refused rather than converted by assumption, because an assumed conversion is the classic silent factor-of-a-thousand error

**T-019** Cause: the movement would go negative at a location where allows_negative is false → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. names the shortfall. This is the one place negative is refused, and it is opt-in per location rather than the default, because refusing to record consumption that has physically happened makes the ledger fiction

**T-020** Cause: the item is not stocked → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. the consuming capability should be recording it as free text instead, and the message says so

**T-021** Cause: unit_cost_minor supplied without view_financial → expect `E_AUTHZ_FIELD`. dropped, and the valuation method supplies the cost instead. Quantity is unaffected, because a store person must be able to record what left the shelf

**T-022** Cause: occurred_at more than movement_backdate_limit_days in the past → expect `E_VALIDATION`, message: 'That is too far back.'. the correct path is an adjustment with a reason, which is separately reported. Arbitrary backdating on the ordinary path lets a ledger be rewritten quietly

**T-023** Cause: the catalogue is unavailable → expect `E_DEPENDENCY`. on a device with a cached item set the movement is recorded against the cached item and re-validated on sync. Refusing to record physical movement because a catalogue service is down is how a store room reverts to paper

## Edge cases

**T-024** (EC-01) Consumption recorded offline in a store room with no signal, which is the normal case. Queued with occurred_at from the device. On sync the movements apply in occurred_at order, so a receipt recorded after a consumption but occurring before it produces the right intermediate balances. Applying in arrival order instead would produce spurious negative balances and a stream of false alerts.

**T-025** (EC-02) A movement driving the balance negative. Recorded, and a distinct event is emitted. Negative stock is a fact - it means a receipt was missed, or a count was wrong, or something was taken without being recorded - and all three are findable only if the negative is allowed to exist. The alert names the most likely cause, which is a missing receipt, because that is what it is nine times out of ten.

**T-026** (EC-03) Two capabilities consuming the same stock concurrently for different work. Both succeed; the ledger has no contention. The balance may go negative and the negative is the signal. Locking to prevent it would serialise the busiest item in the operation at the busiest moment.

**T-027** (EC-04) A movement whose source is later cancelled - a work order voided after parts were fitted. The movement is NOT automatically reversed, because the parts were physically consumed. The reversal is a separate decision with its own reason, and leaving it to a human is the only way to distinguish parts returned to the shelf from parts already installed.

**T-028** (EC-05) Batch and expiry recorded on a receipt. Consumption does not automatically select a batch. Which batch left is a physical fact the person recording it knows and the system does not, so it is captured rather than inferred, and where it is not captured the movement records that the batch is unknown rather than guessing the oldest.

## Idempotency and concurrency

**T-029** Replaying the same request with the same idempotency key produces one effect and one event.

**T-030** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-031** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-032** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 32**
