---
doc_id: ACT-SITES-CREATE_LOCATION
title: Action — Add a location
generated: true
source_model: _model/capabilities/sites.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Add a location

*This document is generated. Edit `_model/capabilities/sites.yaml`, not this file.*

**Entity:** `location` · **Capability:** `sites`

## 1. Specification

### Who can perform it

- tenant_admin
- ops_manager

### Preconditions

- the parent
- where given
- is at a strictly higher level and is not archived
- code is unique within the tenant

### Inputs

- code
- name
- level
- parent_location_id
- address_text
- position
- timezone
- calendar_id
- capacity
- attributes
- criticality
- owning_party_ref

### What is created

- location

### What is modified

- parent location path index

### What events fire

- location.created

### Who is notified

None.

### Can it be undone

Yes.

### Concurrency behaviour

Unique index on (tenant_id, code). Path materialisation for a subtree is done under a lock on the parent, so two children added concurrently cannot both compute a path from a stale parent path. A move operation locks the whole subtree, which is why moves are a separate action rather than an edit.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_CONFLICT_UNIQUE` | 409 | code already exists | That code is already used by another location. | False | names the other location if the creator can see it |
| `E_VALIDATION` | 422 | parent is at the same or a lower level | A location cannot sit inside something smaller than itself. | False |  |
| `E_VALIDATION` | 422 | timezone missing or unrecognised | Choose a timezone. | False | never defaulted from the tenant, because a silently inherited timezone is correct until the day it is not and then breaks every shift boundary at that location at once |
| `E_PRECONDITION` | 409 | the parent has owning_party_ref set and this location does not | This action is not available in the current state. | False | the tenant's own hierarchy may not hang beneath a counterparty's |
| `E_QUOTA` | 402 | location count limit reached | Plan limit reached. | False |  |
| `E_DEPENDENCY` | 424 | address_resolution unavailable while an address was supplied | *(silent)* | True | the location is created with the address stored verbatim and no position, and the creator is told that a geofence cannot be added until a position is set. Creation is never blocked on geocoding |

## 3. Edge cases

**EC-01.** A location created without a position. Fully valid. Positions arrive later, frequently from the first person to visit. What must not happen is a geofence being created against a null position, and that is refused at the geofence rather than by forcing a position here.

**EC-02.** Two locations at the same address - separate tenancies in one building. Legal and common. The duplicate check warns and does not block, because refusing would make the model unable to describe a building with several occupiers.

**EC-03.** A location whose parent is later archived. Refused at archive time by the guard on the parent, not by orphaning the child. Archiving is blocked while any child is active, and the error names the children.

**EC-04.** Creating a location under a region that belongs to a different tenant. Impossible by row-level security rather than by application check, which is why the tenancy is declared rather than assumed.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/sites/location/create_location.md`.
