---
doc_id: ACT-PARTY-PROPOSE_MERGE
title: Action — Propose that two records are the same party
generated: true
source_model: _model/capabilities/party.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Propose that two records are the same party

*This document is generated. Edit `_model/capabilities/party.yaml`, not this file.*

**Entity:** `merge_proposal` · **Capability:** `party`

## 1. Specification

### Who can perform it

- system_rule
- tenant_admin
- ops_manager
- integration_principal

### Preconditions

- both parties exist
- both are in state active or dormant
- the pair is not currently suppressed by a prior rejection

### Inputs

- survivor_party_id
- absorbed_party_id
- matched_on
- score

### What is created

- merge_proposal

### What is modified

None.

### What events fire

- party.merge_proposed

### Who is notified

- **to**: tenant_admin; **channel**: in_app; **when**: score exceeds duplicate_alert_threshold; **template**: possible_duplicate; **batching_policy**: one digest per configured interval, never per proposal

### Can it be undone

Yes.

### Concurrency behaviour

One live proposal per unordered pair, enforced by a unique index over a canonical ordering of the two ids.

### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_CONFLICT_UNIQUE` | 409 | a live proposal already exists for this pair | *(silent)* | False | returns the existing proposal with 200 |
| `E_PRECONDITION` | 409 | either party is already merged, archived or blocked | This action is not available in the current state. | False |  |
| `E_PRECONDITION` | 409 | the pair was rejected and neither party has changed materially since | *(silent)* | False | silently suppressed for a system_rule proposer, refused with a message for a human proposer who is presumably looking at evidence the rule cannot see |
| `E_VALIDATION` | 422 | survivor and absorbed are the same party | These are the same record. | False |  |

## 3. Edge cases

**EC-01.** Three parties that are all duplicates of each other. Three pairwise proposals are raised, not one three-way merge. Merging pairwise is reviewable; a three-way merge presents a conflict matrix no reviewer can hold in their head. After the first merge the remaining proposals are re-scored against the survivor.

**EC-02.** A rule proposes a merge between a party of kind=person and one of kind=organisation. Refused. A sole trader who is both is modelled as an organisation party with a person party related to it, not as one record that is both.

**EC-03.** The survivor choice matters and the rule cannot make it well. The shipped default proposes the OLDER record as survivor, on the grounds that it has more history attached, and the reviewer may swap them. Swapping is offered prominently rather than buried, because the default is right perhaps two thirds of the time.

**EC-04.** A proposal raised against a party in an active workflow. Permitted to propose, refused to execute while any workflow instance holds a lock on either party, and the proposal states which workflow is blocking so the reviewer waits rather than forcing.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/party/merge_proposal/propose_merge.md`.
