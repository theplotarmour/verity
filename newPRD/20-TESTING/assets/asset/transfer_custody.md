---
doc_id: TEST-TRANSFER_CUSTODY
title: Test catalogue — Hand an asset over
generated: true
source_model: _model/capabilities/assets.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Hand an asset over

*This document is generated. Edit `_model/capabilities/assets.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `transfer_custody` is invoked by an authorised actor, then the declared records are created/updated and events ['asset.custody_transferred'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `transfer_custody` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `transfer_custody` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `transfer_custody` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `transfer_custody` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `transfer_custody` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `transfer_custody` succeeds. 

**T-008** As `supervisor` (Site Supervisor), invoking `transfer_custody` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `transfer_custody` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `transfer_custody` succeeds. 

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `transfer_custody` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `transfer_custody` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `transfer_custody` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `transfer_custody` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `transfer_custody` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `transfer_custody` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the asset is disposed or lost → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. for a lost asset the correct act is record_recovery, and the message says so

**T-018** Cause: the receiving custodian is the current one → expect `E_VALIDATION`, message: 'This is already theirs.'.

**T-019** Cause: the receiving custodian is outside the acting principal's scope → expect `E_AUTHZ_SCOPE`, message: 'Not found.'.

**T-020** Cause: condition not stated where the tenant requires it on transfer → expect `E_VALIDATION`, message: 'Say what condition it is in.'. a transfer with no condition statement is how a dispute about who broke something becomes unresolvable

**T-021** Cause: custody changed since the screen loaded → expect `E_CONFLICT_VERSION`, message: 'Someone else changed this record.'. names the current custodian

## Edge cases

**T-022** (EC-01) A transfer the receiving custodian never acknowledges. The custody changes immediately and the lack of acknowledgement is reported, because holding the transfer pending acknowledgement would leave the asset with the person who no longer has it. Acknowledgement is evidence, not a gate.

**T-023** (EC-02) A transfer to somebody whose engagement ends before they acknowledge. The asset returns to the transferring custodian automatically and both are told, because an asset held by a departed person is a loss waiting to be discovered at a count.

**T-024** (EC-03) Condition recorded differently by the two parties. Both statements are retained on the transfer record. The model does not reconcile them; a difference between what the giver said and what the receiver said is precisely the evidence a later damage dispute needs.

**T-025** (EC-04) Bulk transfer when a custodian leaves. Supported as a batch with one reason and one correlation id, so the receiving custodian gets one message listing everything rather than forty messages.

**T-026** (EC-05) A transfer recorded offline at a handover in the field. Queued with its evidence as one unit. Where two offline transfers of one asset sync in conflicting order, both records are retained, the later read_at wins for the current custodian, and the conflict is surfaced rather than resolved silently.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
