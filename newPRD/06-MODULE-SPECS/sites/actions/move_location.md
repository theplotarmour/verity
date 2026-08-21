---
doc_id: ACT-SITES-MOVE_LOCATION
title: Action — Move a location in the hierarchy
generated: true
source_model: _model/capabilities/sites.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Move a location in the hierarchy

*This document is generated. Edit `_model/capabilities/sites.yaml`, not this file.*

**Entity:** `location` · **Capability:** `sites`

**Why this exists:** Reorganisations happen and are the moment permission scopes silently change for everybody. Modelled as an explicit action rather than an edit precisely so the permission consequence is computed and shown before it happens.


## 1. Specification

### Who can perform it

- tenant_admin
- ops_manager

### Preconditions

- acting session is elevated
- the new parent is at a strictly higher level
- the move does not create a cycle
- the subtree is not locked by another move

### Inputs

- location_id
- new_parent_location_id
- reason
- acknowledged_scope_impact

### What is created

None.

### What is modified

- location.parent_location_id
- path for the whole subtree
- scope resolution caches invalidated

### What events fire

- location.moved
- org_structure.changed

### Who is notified

- **to**: principals whose resolved scope changes as a result; **channel**: in_app; **when**: always; **template**: access_scope_changed; **must_include**: ['locations_gained', 'locations_lost']; **mandatory_operational**: True
- **to**: ops_manager; **channel**: in_app; **when**: always; **template**: hierarchy_changed

### Can it be undone

Yes.

### Concurrency behaviour

Takes an exclusive lock on the moving subtree and a shared lock on both parents. Concurrent moves within one subtree serialise. A move racing a create beneath the moving node blocks the create rather than producing a child with a path computed against the old position.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | the new parent is inside the subtree being moved | A location cannot be moved inside itself. | False |  |
| `E_PRECONDITION` | 409 | the move would exceed the maximum hierarchy depth | This action is not available in the current state. | False | names the depth limit |
| `E_PRECONDITION` | 409 | subtree locked by another move | Another change to this part of the hierarchy is in progress. | False |  |
| `E_VALIDATION` | 422 | scope impact not acknowledged | Confirm you have seen who gains and loses access. | False |  |
| `E_AUTHN` | 401 | session not elevated | Confirm your identity to continue. | False |  |
| `E_QUOTA` | 402 | the subtree exceeds max_move_subtree_size | Plan limit reached. | False | a very large move is a migration and is scheduled rather than run while somebody waits, because path rematerialisation over a large subtree holds locks for a long time |

## 3. Edge cases

**EC-01.** A move that removes somebody's access to a location where they have work in progress today. Permitted, listed prominently in the confirmation, and the affected work is listed with its owner. Refusing would make reorganisation impossible; hiding it would strand somebody mid-task.

**EC-02.** A move performed while an offline device holds a cached scope. The device continues on its cached scope until it reconnects, bounded by offline_grace_hours. This is the same exposure as any permission change and is stated in the security model rather than pretended away.

**EC-03.** Moving a location to a parent in a different region changes which region its records roll up to for every past record as well, because roll-up is computed from the current hierarchy. Whether historical reports should follow the old hierarchy or the new one is a genuine reporting question and is flagged in open_questions rather than decided here.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/sites/location/move_location.md`.
