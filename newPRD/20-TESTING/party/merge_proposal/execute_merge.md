---
doc_id: TEST-EXECUTE_MERGE
title: Test catalogue — Merge two party records
generated: true
source_model: _model/capabilities/party.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Merge two party records

*This document is generated. Edit `_model/capabilities/party.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `execute_merge` is invoked by an authorised actor, then the declared records are created/updated and events ['party.merged', 'party_relationship.updated', 'party.channels_consolidated'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `execute_merge` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `execute_merge` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `execute_merge` succeeds. 

**T-005** As `tenant_admin` (Tenant Administrator), invoking `execute_merge` succeeds. 

**T-006** As `finance` (Finance), invoking `execute_merge` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `execute_merge` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `execute_merge` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `execute_merge` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `execute_merge` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `execute_merge` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `execute_merge` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `execute_merge` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `execute_merge` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `execute_merge` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `execute_merge` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: an unresolved conflict remains → expect `E_PRECONDITION`, message: 'Choose a value for each conflicting field first.'. names the fields

**T-018** Cause: a running workflow holds either party → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. names the workflow and its expected completion so the reviewer can wait rather than escalate

**T-019** Cause: either party changed since the proposal was reviewed → expect `E_CONFLICT_VERSION`, message: 'Someone else changed this record.'. the proposal returns to under_review with the conflicts recomputed, and the previously entered resolutions are preserved where the underlying values did not move

**T-020** Cause: session not elevated → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

**T-021** Cause: the repointing transaction fails partway → expect `E_INTERNAL`, message: 'Something went wrong. The team has been notified.'. the whole merge rolls back. The journal exists precisely so that this is recoverable, and it is written first

**T-022** Cause: the merge would repoint more than max_merge_references rows → expect `E_QUOTA`, message: 'Plan limit reached.'. a merge of two very large parties is a migration and must be scheduled rather than run interactively while somebody waits

## Edge cases

**T-023** (EC-01) References held by capabilities that are currently disabled. They are repointed anyway, because they will come back when the capability is re-enabled. The journal records them. Skipping them would produce orphans that surface months later with no explanation.

**T-024** (EC-02) References held through a port by a capability that is not installed at all. These cannot be repointed and are not knowable. This is the strongest argument for the tombstone - the absorbed party row is retained forever with merged_into_party_id set, so any reference that was missed still resolves, and resolution follows the pointer. Every consumer of the party_directory port must follow merged_into_party_id transitively, and that requirement is part of the port contract rather than an implementation note.

**T-025** (EC-03) A merge chain - A merged into B, then B merged into C. Resolution follows the chain to the final survivor, with a depth limit that raises an alert rather than looping. Chains happen and pretending they do not is how a resolver becomes an infinite loop in production.

**T-026** (EC-04) Conflicting consent between the two parties' channels with the same normalised value. The more restrictive value always wins, and this is not offered as a reviewer choice. A merge is not a mechanism for upgrading a refusal into a grant.

**T-027** (EC-05) Conflicting financial fields - two different credit limits. Presented as a conflict requiring explicit resolution, never defaulted, and the resolution is recorded with the reason. A silently chosen credit limit is a silently chosen credit decision.

**T-028** (EC-06) Unmerge after downstream capabilities have already acted on the merged record - an invoice raised against the survivor covering work originally attributed to the absorbed party. The unmerge restores the references it repointed and explicitly does NOT unwind downstream effects; it lists them for the reviewer instead. Claiming to unwind an issued invoice would be a lie.

## Idempotency and concurrency

**T-029** Replaying the same request with the same idempotency key produces one effect and one event.

**T-030** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-031** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-032** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 32**
