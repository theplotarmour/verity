---
doc_id: TEST-PUBLISH_PROJECTION
title: Test catalogue — Change what is searchable
generated: true
source_model: _model/capabilities/search.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Change what is searchable

*This document is generated. Edit `_model/capabilities/search.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `publish_projection` is invoked by an authorised actor, then the declared records are created/updated and events ['search.projection_published'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `publish_projection` succeeds. 

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `publish_projection` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `publish_projection` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `publish_projection` succeeds. 

**T-006** As `finance` (Finance), invoking `publish_projection` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `publish_projection` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `publish_projection` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `publish_projection` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `publish_projection` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `publish_projection` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `publish_projection` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `publish_projection` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `publish_projection` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `publish_projection` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `publish_projection` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: a field projection has no gate_verb → expect `E_VALIDATION`, message: 'Every searchable field needs a permission gate.'. the single most important validation here. A field with no gate is a field somebody indexed by accident and it will be returned to somebody who should not see it

**T-018** Cause: a sensitive or financial field is projected into display_fields without a gate → expect `E_VALIDATION`, message: 'field-specific'.

**T-019** Cause: a scope field the entity is protected by is absent from scope_fields → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. names the missing scope. Publishing anyway would produce an index that cannot be filtered on it, forcing every query into a full re-check

**T-020** Cause: the projection would exceed the tenant index size limit → expect `E_QUOTA`, message: 'Plan limit reached.'.

**T-021** Cause: the owning capability is disabled → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'.

## Edge cases

**T-022** (EC-01) Publishing a projection that adds a gated field. The reindex rebuilds with the gate applied, and until it completes the field is unsearchable rather than searchable without its gate. Ungated-then-gated is the wrong order and would create a window in which the field is exposed.

**T-023** (EC-02) Removing a field from a projection. The reindex removes it and any saved search referencing it becomes broken and is reported. Silently dropping it from those searches would change what they mean without telling anybody.

**T-024** (EC-03) A reindex that takes hours on a large tenant. The previous version serves throughout, and the newly projected fields are unsearchable until it completes. This is invisible to users, which is exactly why the stall monitor reports to operators.

**T-025** (EC-04) Publishing a projection for an entity in a capability that is later disabled. The projection remains and its index is not served, so re-enabling the capability restores search without a rebuild. Deleting it on disable would make re-enablement expensive for no benefit.

## Idempotency and concurrency

**T-026** Replaying the same request with the same idempotency key produces one effect and one event.

**T-027** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-028** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-029** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 29**
