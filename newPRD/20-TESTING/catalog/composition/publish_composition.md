---
doc_id: TEST-PUBLISH_COMPOSITION
title: Test catalogue — Publish what something is made of
generated: true
source_model: _model/capabilities/catalog.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Publish what something is made of

*This document is generated. Edit `_model/capabilities/catalog.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `publish_composition` is invoked by an authorised actor, then the declared records are created/updated and events ['composition.published', 'catalog_item.cost_changed'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `publish_composition` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `publish_composition` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `publish_composition` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `publish_composition` succeeds. 

**T-006** As `finance` (Finance), invoking `publish_composition` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `publish_composition` succeeds. 

**T-008** As `supervisor` (Site Supervisor), invoking `publish_composition` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `publish_composition` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `publish_composition` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `publish_composition` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `publish_composition` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `publish_composition` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `publish_composition` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `publish_composition` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `publish_composition` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: a cycle exists at any depth → expect `E_VALIDATION`, message: 'This would make the item contain itself.'. names the full path

**T-018** Cause: depth exceeds the bound → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. names the depth and the path

**T-019** Cause: a component quantity is zero or negative → expect `E_VALIDATION`, message: 'field-specific'.

**T-020** Cause: a component unit of measure differs from the component item's own unit with no conversion available → expect `E_VALIDATION`, message: 'Choose a unit this component is measured in.'. refused rather than converted by assumption. An assumed conversion between mass and volume is the classic silent factor-of-a-thousand error

**T-021** Cause: a component item is archived → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. names the component

## Edge cases

**T-022** (EC-01) A composition whose components have their own compositions. Depth resolves through them and the resolved depth is recorded. Nesting is expressed by components having compositions rather than by nesting inside one document, which keeps each composition individually readable and diffable.

**T-023** (EC-02) A yield_percent below one hundred, expressing loss in production. Supported, and it changes the derived cost. Without it the derived cost of anything with waste is systematically understated, which shows up as a margin that looks better than it is.

**T-024** (EC-03) Publishing a composition for an item that is already active and being sold. Permitted; the new version takes effect for transactions from effective_from, and everything already sold keeps its captured version. This is the whole reason compositions are versioned.

**T-025** (EC-04) A component that is itself unavailable at publication. Permitted with a warning, because a temporarily unavailable component should not block a recipe change. The parent item's availability derivation is what surfaces the consequence, and it does so continuously.

## Idempotency and concurrency

**T-026** Replaying the same request with the same idempotency key produces one effect and one event.

**T-027** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-028** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-029** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 29**
