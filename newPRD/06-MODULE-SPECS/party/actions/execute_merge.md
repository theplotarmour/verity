---
doc_id: ACT-PARTY-EXECUTE_MERGE
title: Action — Merge two party records
generated: true
source_model: _model/capabilities/party.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Merge two party records

*This document is generated. Edit `_model/capabilities/party.yaml`, not this file.*

**Entity:** `merge_proposal` · **Capability:** `party`

**Why this exists:** The single most destructive routine action in the platform, and the one most often implemented as an irreversible one-click convenience.

## 1. Specification

### Who can perform it

- tenant_admin
- tenant_owner

### Preconditions

- Acting session is elevated.
- The proposal is under_review and claimed by the acting principal.
- Every conflict has a field_resolution.
- Neither party is locked by a running workflow.

### Inputs

- proposal_id
- field_resolution
- reason

### What is created

- merge_journal within the proposal

### What is modified

- absorbed party moved to merged
- every reference repointed
- channels and relationships consolidated
- undo_deadline_at set

### What events fire

- party.merged
- party_relationship.updated
- party.channels_consolidated

### Who is notified

- **to**: the relationship owners of both parties; **channel**: in_app; **when**: always; **template**: parties_merged; **must_include**: ['survivor_display_name', 'absorbed_display_name', 'actor_display_name', 'undo_deadline']

### Can it be undone

Yes.

### Concurrency behaviour

Both party rows are locked for the duration, in a canonical id order to avoid deadlock between two merges sharing a party. References are repointed inside the same transaction as the journal write. A merge is never partially applied - the alternative is a party whose invoices point at one record and whose work orders point at another, which is unrecoverable without the journal that a partial merge would not have written.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | an unresolved conflict remains | Choose a value for each conflicting field first. | False | names the fields |
| `E_PRECONDITION` | 409 | a running workflow holds either party | This action is not available in the current state. | False | names the workflow and its expected completion so the reviewer can wait rather than escalate |
| `E_CONFLICT_VERSION` | 409 | either party changed since the proposal was reviewed | Someone else changed this record. | True | the proposal returns to under_review with the conflicts recomputed, and the previously entered resolutions are preserved where the underlying values did not move |
| `E_AUTHN` | 401 | session not elevated | Confirm your identity to continue. | False |  |
| `E_INTERNAL` | 500 | the repointing transaction fails partway | Something went wrong. The team has been notified. | True | the whole merge rolls back. The journal exists precisely so that this is recoverable, and it is written first |
| `E_QUOTA` | 402 | the merge would repoint more than max_merge_references rows | Plan limit reached. | False | a merge of two very large parties is a migration and must be scheduled rather than run interactively while somebody waits |

## 3. Edge cases

**EC-01.** References held by capabilities that are currently disabled. They are repointed anyway, because they will come back when the capability is re-enabled. The journal records them. Skipping them would produce orphans that surface months later with no explanation.

**EC-02.** References held through a port by a capability that is not installed at all. These cannot be repointed and are not knowable. This is the strongest argument for the tombstone - the absorbed party row is retained forever with merged_into_party_id set, so any reference that was missed still resolves, and resolution follows the pointer. Every consumer of the party_directory port must follow merged_into_party_id transitively, and that requirement is part of the port contract rather than an implementation note.

**EC-03.** A merge chain - A merged into B, then B merged into C. Resolution follows the chain to the final survivor, with a depth limit that raises an alert rather than looping. Chains happen and pretending they do not is how a resolver becomes an infinite loop in production.

**EC-04.** Conflicting consent between the two parties' channels with the same normalised value. The more restrictive value always wins, and this is not offered as a reviewer choice. A merge is not a mechanism for upgrading a refusal into a grant.

**EC-05.** Conflicting financial fields - two different credit limits. Presented as a conflict requiring explicit resolution, never defaulted, and the resolution is recorded with the reason. A silently chosen credit limit is a silently chosen credit decision.

**EC-06.** Unmerge after downstream capabilities have already acted on the merged record - an invoice raised against the survivor covering work originally attributed to the absorbed party. The unmerge restores the references it repointed and explicitly does NOT unwind downstream effects; it lists them for the reviewer instead. Claiming to unwind an issued invoice would be a lie.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/party/merge_proposal/execute_merge.md`.
