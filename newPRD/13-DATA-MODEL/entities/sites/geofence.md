---
doc_id: ENT-GEOFENCE
title: Entity — Geofence
generated: true
source_model: _model/capabilities/sites.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Geofence

*This document is generated. Edit `_model/capabilities/sites.yaml`, not this file.*

**Capability/module:** `sites` · **Owner scope:** `tenant`

A boundary around a location, with an explicit accuracy and confidence model, used as evidence about presence rather than as proof of it.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `location_id` | uuid | yes | no | — | no | no |  |
| `shape` | enum | yes | no | — | no | no |  |
| `centre` | geo_point | no | no | — | no | no | required for circle |
| `radius_m` | int | no | no | — | no | no | required for circle |
| `polygon` | json | no | no | — | no | no | ordered list of coordinate pairs; scalars only, per the object-valued prohibition, so it is stored as a flat ordered list |
| `tolerance_m` | int | yes | no | — | no | no | the slop added to the boundary before a position is called outside. Mandatory and explicit, because the alternative is a hardcoded tolerance that is wrong at every dense urban location |
| `min_accuracy_m` | int | yes | no | — | no | no | a reading less accurate than this yields inconclusive, never outside. This single default is what stops the system accusing people of lying because they were indoors |
| `purpose` | enum | yes | no | — | no | no |  |
| `effective_from` | timestamptz | yes | no | — | no | no |  |
| `effective_to` | timestamptz | no | no | — | no | no |  |

## 2. Lifecycle

States: `draft`, `active`, `retired`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `active` | False | True | True | In normal operational use. |
| `retired` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. Exactly one of the circle fields or the polygon field is populated, matching shape. A geofence carrying both is ambiguous and is rejected.
2. A geofence evaluation returns one of inside, outside or inconclusive. It is never a boolean. Every consumer must handle three values, and this is enforced by the port contract rather than left to good intentions.
3. min_accuracy_m may never be set above geofence_usable_accuracy_m without an explicit acknowledgement recorded on the write, because a geofence with a very permissive accuracy floor returns inside almost everywhere and looks like it is working.
4. A geofence is versioned by effective_from. Editing one in place would re-evaluate historical presence evidence against a boundary that did not exist at the time.

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

- Permission matrix: `14-PERMISSIONS/sites/geofence.md`
- Screen specifications: `11-UX/screens/sites/geofence/`
- Test catalogue: `20-TESTING/sites/geofence/`
