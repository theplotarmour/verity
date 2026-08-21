---
doc_id: ENT-SEARCH_PROJECTION
title: Entity — Search Projection
generated: true
source_model: _model/capabilities/search.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Search Projection

*This document is generated. Edit `_model/capabilities/search.yaml`, not this file.*

**Capability/module:** `search` · **Owner scope:** `tenant`

The declaration by a capability of which of its fields enter the index, under which permission gate, and how they are matched.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `capability_key` | string | yes | no | — | no | no |  |
| `entity_key` | string | yes | no | — | no | no |  |
| `field_projections` | json | yes | no | — | no | no | flat list per field - field_key, match_mode, weight, gate_verb. gate_verb is mandatory on every entry, because a field with no declared gate is a field somebody will index by accident |
| `display_fields` | json | yes | no | — | no | no | what a result row shows, which is a different and usually smaller set than what is matched |
| `scope_fields` | json | yes | no | — | no | no | the fields carrying tenant, site, party and owner references, denormalised into the index so a filter can be applied at query time without a join |
| `freshness_target_seconds` | int | yes | no | — | no | no | how far behind the index may be before it is reported as stale for this entity |
| `reindex_priority` | enum | yes | no | — | no | no |  |
| `include_archived` | bool | yes | no | — | no | no |  |
| `version_number` | int | yes | no | — | no | no |  |

## 2. Lifecycle

States: `draft`, `active`, `reindexing`, `superseded`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `active` | False | True | True | In normal operational use. |
| `reindexing` | GAP | GAP | GAP | entity-specific, see capability model |
| `superseded` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. Every field projection declares a gate_verb. A projection entry with no gate is rejected at publication, because the default of no gate is exactly the mistake that turns search into a disclosure.
2. A field marked sensitive or financial on its owning entity may appear in field_projections only with a matching gate_verb, and may never appear in display_fields without one.
3. scope_fields must include every scope kind the entity is protected by. A projection that omits a scope field produces an index that cannot be filtered on it, and the query layer then has to fall back to re-checking every candidate, which is correct and slow.
4. Changing a projection produces a new version and a reindex. An in-place change means the index contains two shapes and a query matching on the new shape silently misses old rows.

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

- Permission matrix: `14-PERMISSIONS/search/search_projection.md`
- Screen specifications: `11-UX/screens/search/search_projection/`
- Test catalogue: `20-TESTING/search/search_projection/`
