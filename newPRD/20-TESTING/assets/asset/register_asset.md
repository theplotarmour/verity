---
doc_id: TEST-REGISTER_ASSET
title: Test catalogue — Add an asset
generated: true
source_model: _model/capabilities/assets.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Add an asset

*This document is generated. Edit `_model/capabilities/assets.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `register_asset` is invoked by an authorised actor, then the declared records are created/updated and events ['asset.registered'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `register_asset` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `register_asset` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `register_asset` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `register_asset` succeeds. 

**T-006** As `finance` (Finance), invoking `register_asset` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `register_asset` succeeds. 

**T-008** As `supervisor` (Site Supervisor), invoking `register_asset` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `register_asset` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `register_asset` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `register_asset` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `register_asset` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `register_asset` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `register_asset` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `register_asset` succeeds. 

## Tenant isolation

**T-016** A principal in tenant A invoking `register_asset` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the tag already exists → expect `E_CONFLICT_UNIQUE`, message: 'That tag is already used.'. shows the existing asset, because the next question is always which one

**T-018** Cause: the class is not active → expect `E_PRECONDITION`, message: 'This kind of asset is not available.'.

**T-019** Cause: a required attribute for the class is missing → expect `E_VALIDATION`, message: 'field-specific'. permitted at registration and blocking at commissioning, because a bulk import frequently lacks details that are filled in when somebody physically visits the thing

**T-020** Cause: acquisition cost supplied without view_financial → expect `E_AUTHZ_FIELD`. dropped and reported

**T-021** Cause: asset count limit reached → expect `E_QUOTA`, message: 'Plan limit reached.'.

**T-022** Cause: parent would create a cycle or exceed the depth bound → expect `E_VALIDATION`, message: 'field-specific'. names the path

## Edge cases

**T-023** (EC-01) A bulk import at onboarding. Idempotent on the tag, so a re-uploaded file produces no duplicates. Assets arrive in registered rather than in_service, and the uncommissioned monitor is what stops several hundred of them sitting there generating no maintenance demand - which is exactly what happens without it.

**T-024** (EC-02) {'An asset registered without a class-required attribute. Permitted, and commissioning is what blocks. This split is deliberate': 'the register should accept what is known now, and the point at which the thing becomes operationally live is the right place to insist.'}

**T-025** (EC-03) Registering something that belongs to a counterparty. Fully supported through owning_party_ref and is the normal case for a maintenance business. Depreciation does not apply to it, and the surface does not show depreciation fields at all rather than showing them empty.

**T-026** (EC-04) Two physical things sharing one tag because a label was reused. The unique constraint catches it and the resolution is a new tag, never a re-tag, because the immutable tag is what keeps the physical label and the record aligned.

**T-027** (EC-05) Registration offline by somebody walking round a location with a scanner. Queued. Tag conflicts resolve on sync and are surfaced as a conflict rather than silently merged, because two things with one label is a physical problem that needs a physical fix.

## Idempotency and concurrency

**T-028** Replaying the same request with the same idempotency key produces one effect and one event.

**T-029** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-030** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-031** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 31**
