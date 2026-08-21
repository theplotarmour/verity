---
doc_id: ENT-STATION
title: Entity — Station
generated: true
source_model: _model/capabilities/kitchen_flow.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Station

*This document is generated. Edit `_model/capabilities/kitchen_flow.yaml`, not this file.*

**Capability/module:** `kitchen_flow` · **Owner scope:** `tenant`

A place where preparation work happens, with its own queue, its own display and its own capacity.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `location_ref` | uuid | yes | no | — | no | no | resolved through the org_structure port |
| `key` | string | yes | yes | tenant | no | no |  |
| `label` | string | yes | no | — | no | no | what is written on the screen and said out loud. Short by necessity |
| `routing_tags` | json | yes | no | — | no | no | flat list of scalars matched against a line's routing tags. This is the entire routing mechanism and it is deliberately a tag match rather than a rule, because a rule engine on a station screen is a rule engine nobody can debug at the busiest hour |
| `concurrent_capacity` | int | yes | no | — | no | no | how many preparation steps this station can have in progress at once. Drives the queue display and the load warning |
| `sequence_position` | int | yes | no | — | no | no | where this station sits in a chain, for operations where work passes from one station to the next. Zero means it is not part of a chain |
| `default_step_seconds` | int | no | no | — | no | no | used where an item supplies no duration, so that a timer exists rather than not existing |
| `display_device_refs` | json | no | no | — | no | no | flat list of device references, resolved through the principal_directory port |
| `expedite_visible` | bool | yes | no | — | no | no | whether this station sees expedite signals. A station that cannot act on urgency should not be shown it |
| `accepts_when_offline` | bool | yes | no | — | no | no |  |

## 2. Lifecycle

States: `draft`, `open`, `paused`, `closed`, `retired`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `open` | GAP | GAP | GAP | entity-specific, see capability model |
| `paused` | GAP | GAP | GAP | entity-specific, see capability model |
| `closed` | GAP | GAP | GAP | entity-specific, see capability model |
| `retired` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. routing_tags may not be empty. A station with no tags receives nothing and appears to be broken to whoever is standing at it.
2. concurrent_capacity is at least one.
3. Two stations at one location may share routing tags; a line matching both is routed to both only where the line explicitly requires multi-station preparation, and otherwise to the one with the lowest sequence_position. This is stated because the alternative - duplicating every ambiguous line - is how one request becomes two pieces of work.
4. A station may not be deleted while any non-terminal preparation ticket references it. Stations are retired, because a historical ticket must resolve to where it was prepared.

## 4. Deletion and retention semantics

| Question | Answer |
|---|---|
| Soft or hard delete | Soft by default (`deleted` reserved state). Hard delete only via retention job or a data-subject erasure request. |
| What happens to children | Blocked if any child row in a non-terminal state references this row. The user is shown the blocking rows, not a generic error. |
| What happens to audit rows | Retained. Audit rows are never cascade-deleted. |
| What happens to emitted events | Retained. Events are immutable history. |
| Archive vs delete | Archive removes from default lists and aggregate reports; delete removes from all reads except audit and legal hold. |

## 5. Tenant isolation

Tenancy mode: `tenant_scoped_with_site_partition`. Enforced by Postgres row-level security on `tenant_id`, not by application `WHERE` clauses. Every query runs under a role that cannot see other tenants even if the application layer forgets a predicate. Cross-tenant reads require a platform archetype and are audited under `security`.

## 6. Related documents

- Permission matrix: `14-PERMISSIONS/kitchen_flow/station.md`
- Screen specifications: `11-UX/screens/kitchen_flow/station/`
- Test catalogue: `20-TESTING/kitchen_flow/station/`
