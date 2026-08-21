---
doc_id: TEST-PULL_DATASET
title: Test catalogue — Refresh what the device holds
generated: true
source_model: _model/capabilities/offline_sync.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Refresh what the device holds

*This document is generated. Edit `_model/capabilities/offline_sync.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `pull_dataset` is invoked by an authorised actor, then the declared records are created/updated and events ['sync.pulled'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `pull_dataset` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `pull_dataset` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `pull_dataset` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `pull_dataset` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `pull_dataset` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `pull_dataset` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `pull_dataset` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `pull_dataset` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `pull_dataset` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `pull_dataset` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `pull_dataset` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `pull_dataset` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `pull_dataset` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `pull_dataset` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `pull_dataset` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the requested scope exceeds the principal's live permission → expect `E_AUTHZ_SCOPE`. the scope is NARROWED server-side to what the principal may see and the narrowing is reported to the device, which then deletes what it may no longer hold. A client never widens its own scope

**T-018** Cause: the dataset version has changed incompatibly → expect `E_PRECONDITION`. a full resync is required and is offered as such. A device silently mixing two schema versions produces mutations the server cannot interpret

**T-019** Cause: the dataset exceeds the device storage limit → expect `E_QUOTA`. the scope is reduced by the declared priority order - assignments for today before history - and the reduction is reported. A pull that simply fails leaves the device with nothing

**T-020** Cause: a device pulling far more often than its data changes → expect `E_RATE_LIMIT`. throttled. Usually a client defect and the person holding the device can do nothing about it

**T-021** Cause: the authorization service is unavailable → expect `E_DEPENDENCY`. the pull is REFUSED. Serving a dataset without resolving the scope would mean guessing what somebody may see, and the safe guess is nothing, which is the same as refusing

## Edge cases

**T-022** (EC-01) A principal whose scope narrows while their device is offline. The narrowing takes effect at the next pull, and the device deletes what it may no longer hold. Between the change and the next contact the device holds data the principal can no longer see, bounded by offline_grace_hours, and that exposure is stated in the security model rather than pretended away.

**T-023** (EC-02) A shared device with several principals' stores. Each store pulls under its own principal's scope and they never merge. The device shows only the signed-in principal's store, and switching principals does not carry data across.

**T-024** (EC-03) An initial pull at a location with poor connectivity - the characteristic provisioning failure. The dataset is delivered in priority order so that a partial pull is still usable, and the store reports which priorities it holds. A device with today's assignments and no history is far more useful than one with nothing.

**T-025** (EC-04) A pull that would exceed storage. Reduced by priority rather than failed, and the reduction is visible to the person. A field application that silently holds less than the person expects is one they stop trusting the first time something is missing.

## Idempotency and concurrency

**T-026** Replaying the same request with the same idempotency key produces one effect and one event.

**T-027** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-028** An audit row of class `read_sensitive_only` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-029** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 29**
