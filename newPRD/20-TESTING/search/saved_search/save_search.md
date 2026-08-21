---
doc_id: TEST-SAVE_SEARCH
title: Test catalogue — Save a search
generated: true
source_model: _model/capabilities/search.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Save a search

*This document is generated. Edit `_model/capabilities/search.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `save_search` is invoked by an authorised actor, then the declared records are created/updated and events ['search.saved'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `save_search` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `save_search` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `save_search` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `save_search` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `save_search` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `save_search` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `save_search` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `save_search` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `save_search` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `save_search` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `save_search` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `save_search` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `save_search` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `save_search` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `save_search` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: label empty → expect `E_VALIDATION`, message: 'Give it a name.'.

**T-018** Cause: sharing with a role the saver cannot themselves grant to → expect `E_AUTHZ_ENTITY`, message: 'You cannot grant access you do not have.'. sharing a search is not sharing data, and it is still restricted, because a shared search is a strong hint about what exists

**T-019** Cause: notify_on_new_results requested while the notification port is unbound → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. the search saves without the subscription rather than failing entirely

**T-020** Cause: more than max_saved_searches per principal → expect `E_QUOTA`, message: 'Plan limit reached.'.

## Edge cases

**T-021** (EC-01) A search shared with a role whose holders have narrower scope. It runs under each runner's own scope and returns their results. This is the whole safety property, and the sharing notification says so explicitly, because the author will otherwise assume the recipient sees what they see.

**T-022** (EC-02) A saved search with a subscription whose result set grows enormously after a capability change. The growth alert fires before the notification volume arrives. Without it the first symptom is somebody receiving four hundred alerts.

**T-023** (EC-03) A saved search whose author leaves. Ownership transfers to a role rather than lapsing, where the search was shared; where it was private it is archived with its definition retained, because a private working set that vanishes silently is a loss nobody can reconstruct.

**T-024** (EC-04) Two principals saving identical searches. Both exist. Deduplicating across principals would mean one person's rename affects another's list.

## Idempotency and concurrency

**T-025** Replaying the same request with the same idempotency key produces one effect and one event.

**T-026** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-027** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-028** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 28**
