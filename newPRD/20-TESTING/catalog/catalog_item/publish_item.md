---
doc_id: TEST-PUBLISH_ITEM
title: Test catalogue — Publish an item
generated: true
source_model: _model/capabilities/catalog.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Publish an item

*This document is generated. Edit `_model/capabilities/catalog.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `publish_item` is invoked by an authorised actor, then the declared records are created/updated and events ['catalog_item.published'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `publish_item` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `publish_item` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `publish_item` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `publish_item` succeeds. 

**T-006** As `finance` (Finance), invoking `publish_item` succeeds. 

**T-007** As `ops_manager` (Operations / Area Manager), invoking `publish_item` succeeds. 

**T-008** As `supervisor` (Site Supervisor), invoking `publish_item` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `publish_item` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `publish_item` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `publish_item` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `publish_item` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `publish_item` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `publish_item` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `publish_item` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `publish_item` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: no unit of measure → expect `E_PRECONDITION`, message: 'Choose the unit this is measured in.'. never defaulted

**T-018** Cause: sellable with no tax classification and no category default → expect `E_PRECONDITION`, message: 'Choose a tax classification.'. refused rather than defaulted, because a guessed classification produces documents that are wrong in a way an authority notices before the tenant does

**T-019** Cause: no applicable price rule → expect `E_PRECONDITION`, message: 'This has no price yet.'. names the scopes that were searched, so the fix is obvious rather than requiring somebody to reason about precedence

**T-020** Cause: an option group cannot satisfy its own selection rule → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. names the group and what is missing

**T-021** Cause: the composition contains a cycle or exceeds the depth bound → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. names the path, because a cycle three levels down is otherwise impossible to find

**T-022** Cause: catalogue item limit reached → expect `E_QUOTA`, message: 'Plan limit reached.'.

## Edge cases

**T-023** (EC-01) Publishing an item whose composition references a component that is itself only in draft. Refused, and the draft component is named. Publishing would produce a sellable item that cannot be produced, which is discovered by somebody standing at a counter.

**T-024** (EC-02) Publishing during an active price change window, where a scheduled rule takes effect within minutes. Permitted, and the publication response states the upcoming price and its effective time, because publishing at the old price minutes before it changes is a decision somebody should make knowingly.

**T-025** (EC-03) Publishing a non-sellable item used only as a component. No price rule and no tax classification is required. This is the common case for raw components and refusing it would force fictional prices onto everything a business consumes.

**T-026** (EC-04) Republishing after a version change. The new version publishes and the previous version is superseded rather than archived, so existing transaction lines still resolve to the version they captured.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
