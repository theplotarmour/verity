---
doc_id: ACT-OFFLINE_SYNC-RESOLVE_CONFLICT
title: Action — Decide between two versions
generated: true
source_model: _model/capabilities/offline_sync.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Decide between two versions

*This document is generated. Edit `_model/capabilities/offline_sync.yaml`, not this file.*

**Entity:** `sync_conflict` · **Capability:** `offline_sync`

**Why this exists:** The point at which the platform admits that two people did incompatible things and asks a human. Everything about the presentation is designed so that the human can actually decide - the differing fields only, both authors named, both times shown.


## 1. Specification

### Who can perform it

- employee
- supervisor
- ops_manager
- system

### Preconditions

- the conflict is open
- under_review or escalated
- the resolver is a party to it or holds authority over the subject

### Inputs

- conflict_id
- resolution
- field_choices
- reason

### What is created

None.

### What is modified

- the subject record
- conflict resolution
- mutation state

### What events fire

- sync.conflict_resolved

### Who is notified

- **to**: both the device principal and the server principal; **channel**: in_app_and_device_surface; **when**: always; **template**: conflict_resolved; **must_include**: ['what_was_kept', 'what_was_discarded', 'who_decided', 'reason']; **mandatory_operational**: True
- **to**: the owning capability's owner; **channel**: in_app; **when**: the field conflict rate exceeds the alert; **template**: merge_strategy_review; **batching_policy**: monthly

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

The conflict is claimed before resolution so two people cannot resolve it differently. Resolution takes the subject row and re-checks the server version inside the transaction; where the server changed again since the conflict was raised, the resolution fails and a new conflict is raised on the new pair, because resolving against a stale server version would discard a third person's change nobody has seen.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_CONFLICT_VERSION` | 409 | the server version changed again since the conflict was raised | Someone else changed this record. | True | a new conflict is raised on the current pair and the previous resolution attempt is retained. Three-way conflicts are rare and silently applying a stale resolution is how the third change disappears |
| `E_VALIDATION` | 422 | a reason is required for a manual-strategy field and none is supplied | Say why. Both people will see it. | False |  |
| `E_PRECONDITION` | 409 | the conflict is claimed by somebody else | Someone else is looking at this. | False | names them and the remaining claim time |
| `E_AUTHZ_ENTITY` | 403 | the resolver holds no authority over the subject | You do not have access to this record type. | False |  |
| `E_PRECONDITION` | 409 | the resolution would apply a financial field from a device version | *(silent)* | False | refused. A financial value cannot arrive from an offline device under any resolution, which is the kernel rule enforced once more at the last possible point |

## 3. Edge cases

**EC-01.** A conflict where the two versions are both correct because they concern different things that happened - a technician recorded a completion and a supervisor recorded a cancellation. both_retained produces two records and the underlying capability decides what that means. Forcing a single winner would erase one of two true facts.

**EC-02.** Automatic resolution where every conflicting field declares a non-manual strategy. Applied and both parties are still told what happened to their change. Silent automatic resolution is how somebody discovers a fortnight later that their edit never took effect.

**EC-03.** A conflict on a quantity field with last-write-wins declared. Applied by strategy and counted. The field conflict monitor exists precisely so that a quantity field carrying a careless last-write-wins strategy is discovered from its conflict rate rather than from a stock discrepancy.

**EC-04.** A conflict whose device principal has since left. The supervisor resolves it, the departed principal is not notified, and the conflict record retains their authorship. Their work is still theirs.

**EC-05.** A conflict escalated because the two parties disagree with each other. There is no mechanism inside the platform that compels agreement, and the escalated state exists so the disagreement is visible to somebody who can end it. The model does not pretend to arbitrate.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/offline_sync/sync_conflict/resolve_conflict.md`.
