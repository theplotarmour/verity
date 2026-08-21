---
doc_id: ENT-LOCATION
title: Entity — Location
generated: true
source_model: _model/capabilities/sites.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Location

*This document is generated. Edit `_model/capabilities/sites.yaml`, not this file.*

**Capability/module:** `sites` · **Owner scope:** `tenant`

A place with an address, a position in a hierarchy, and an operating calendar. The unit that own_site scope resolves against.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `code` | string | yes | no | tenant | no | no | a short human key people say out loud on the phone. Mandatory because every operational conversation needs one and if the model does not supply it, somebody puts it in the name |
| `name` | string | yes | no | — | no | no |  |
| `level` | enum | yes | no | — | no | no | a closed ladder rather than free-form nesting, so depth is bounded and so "which region" is always answerable in one hop |
| `parent_location_id` | uuid | no | no | — | no | no |  |
| `path` | string | yes | no | — | no | no | materialised ancestor path, maintained on write. Scope resolution is a prefix match rather than a recursive walk, because scope resolution happens on every request |
| `owning_party_ref` | uuid | no | no | — | no | no | null when the tenant owns or occupies it themselves; otherwise the counterparty whose location this is, resolved through the party_directory port |
| `address_text` | text | no | no | — | no | no | as entered. Retained verbatim even after geocoding, because the normalised form is frequently worse at finding the gate |
| `position` | geo_point | no | no | — | no | no |  |
| `position_accuracy_m` | int | no | no | — | no | no | the accuracy of the recorded position itself. A geofence computed against a position captured at 200m accuracy is a geofence with 200m of slop before anyone moves |
| `timezone` | string | yes | no | — | no | no | mandatory and per location. A tenant operating across one timezone still needs this, because assuming the tenant timezone is how a multi-region expansion breaks every shift boundary at once |
| `operating_calendar_id` | uuid | no | no | — | no | no |  |
| `capacity` | int | no | no | — | no | no | a generic count of how many of the thing this location holds. What the thing is belongs to the pack, never here |
| `attributes` | json | no | no | — | no | no | pack-defined key-value attributes of scalars only, per the kernel prohibition on object-valued configuration. This is the extension point that keeps industry properties out of the core schema |
| `criticality` | enum | yes | no | — | no | no | drives escalation defaults through the sla_clock port without this capability knowing what an escalation is |
| `opened_at` | date | no | no | — | no | no |  |
| `closed_at` | date | no | no | — | no | no |  |

## 2. Lifecycle

States: `planned`, `active`, `suspended`, `closed`, `archived`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `planned` | GAP | GAP | GAP | entity-specific, see capability model |
| `active` | False | True | True | In normal operational use. |
| `suspended` | GAP | GAP | GAP | entity-specific, see capability model |
| `closed` | GAP | GAP | GAP | entity-specific, see capability model |
| `archived` | True | False | False | Retained, excluded from default lists and from all aggregate reports unless explicitly included. |

## 3. Invariants

1. parent_location_id must reference a location at a strictly higher level in the ladder. A floor cannot be the parent of a building.
2. path is derived and is never writable directly. A hand-edited path is a scope resolution that silently grants access to the wrong locations.
3. A location with owning_party_ref set may not be an ancestor of a location without one. The tenant's own hierarchy never hangs beneath a counterparty's.
4. Deleting is not offered. A location that is finished is closed, then archived, because attendance, work and invoices reference it forever.

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

- Permission matrix: `14-PERMISSIONS/sites/location.md`
- Screen specifications: `11-UX/screens/sites/location/`
- Test catalogue: `20-TESTING/sites/location/`
