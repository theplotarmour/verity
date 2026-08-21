---
doc_id: ENT-MERGE_PROPOSAL
title: Entity — Merge Proposal
generated: true
source_model: _model/capabilities/party.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Merge Proposal

*This document is generated. Edit `_model/capabilities/party.yaml`, not this file.*

**Capability/module:** `party` · **Owner scope:** `tenant`

A reviewable statement that two parties are the same party, with the evidence for it and the record of what a merge would do.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `survivor_party_id` | uuid | yes | no | — | no | no |  |
| `absorbed_party_id` | uuid | yes | no | — | no | no |  |
| `score` | decimal | yes | no | — | no | no | the duplicate score at proposal time |
| `matched_on` | json | yes | no | — | no | no | which rules fired and on which values, so a reviewer can see WHY rather than being shown a number |
| `conflicts` | json | yes | no | — | no | no | fields where the two parties disagree, which is the part a human must resolve and the part an automatic merge silently gets wrong |
| `field_resolution` | json | no | no | — | no | no | the reviewer's per-field choice, required before execution wherever a conflict exists |
| `proposed_by` | enum | yes | no | — | no | no |  |
| `proposed_by_principal_id` | uuid | no | no | — | no | no |  |
| `reviewed_by_principal_id` | uuid | no | no | — | no | no |  |
| `executed_at` | timestamptz | no | no | — | no | no |  |
| `merge_journal` | json | no | no | — | no | no | every reference repointed, recorded before the repointing so an unmerge can restore it. Discarded when the undo window closes |
| `undo_deadline_at` | timestamptz | no | no | — | no | no |  |

## 2. Lifecycle

States: `proposed`, `under_review`, `rejected`, `executed`, `undone`, `expired`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `proposed` | GAP | GAP | GAP | entity-specific, see capability model |
| `under_review` | GAP | GAP | GAP | entity-specific, see capability model |
| `rejected` | GAP | GAP | GAP | entity-specific, see capability model |
| `executed` | GAP | GAP | GAP | entity-specific, see capability model |
| `undone` | GAP | GAP | GAP | entity-specific, see capability model |
| `expired` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. survivor_party_id and absorbed_party_id must differ and must both be in state active or dormant. Merging a party that is already merged produces a chain nobody can follow.
2. Execution is refused while any conflict lacks a field_resolution. An automatic resolution of a conflicting tax registration number or a conflicting credit limit is a financial error wearing the costume of a convenience feature.
3. The merge_journal is written BEFORE any reference is repointed, in the same transaction. A journal written afterwards is a journal that does not exist when the merge fails halfway.

## 4. Deletion and retention semantics

| Question | Answer |
|---|---|
| Soft or hard delete | Soft by default (`deleted` reserved state). Hard delete only via retention job or a data-subject erasure request. |
| What happens to children | Blocked if any child row in a non-terminal state references this row. The user is shown the blocking rows, not a generic error. |
| What happens to audit rows | Retained. Audit rows are never cascade-deleted. |
| What happens to emitted events | Retained. Events are immutable history. |
| Archive vs delete | Archive removes from default lists and aggregate reports; delete removes from all reads except audit and legal hold. |

## 5. Tenant isolation

Tenancy mode: `tenant_scoped`. Enforced by Postgres row-level security on `tenant_id`, not by application `WHERE` clauses. Every query runs under a role that cannot see other tenants even if the application layer forgets a predicate. Cross-tenant reads require a platform archetype and are audited under `security`.

## 6. Related documents

- Permission matrix: `14-PERMISSIONS/party/merge_proposal.md`
- Screen specifications: `11-UX/screens/party/merge_proposal/`
- Test catalogue: `20-TESTING/party/merge_proposal/`
