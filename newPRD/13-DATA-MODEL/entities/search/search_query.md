---
doc_id: ENT-SEARCH_QUERY
title: Entity — Search Query
generated: true
source_model: _model/capabilities/search.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Search Query

*This document is generated. Edit `_model/capabilities/search.yaml`, not this file.*

**Capability/module:** `search` · **Owner scope:** `tenant`

One execution of a search, recorded because search is an exfiltration surface and because what people look for is the most useful signal about what the product is missing.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `principal_id` | uuid | yes | no | — | no | no |  |
| `term` | text | no | no | — | yes | no | sensitive because a search term is frequently a person's name, a phone number or a document number, and the log of what somebody searched for is itself a disclosure |
| `filters` | json | no | no | — | no | no |  |
| `scope_fingerprint` | string | yes | no | — | no | no | a hash of the principal's resolved scope at query time, so that an identical term returning different results at different times is explicable |
| `entity_keys_searched` | json | yes | no | — | no | no |  |
| `result_count_returned` | int | yes | no | — | no | no |  |
| `candidates_considered` | int | yes | no | — | no | no | before permission re-checking, retained so the cost of the second check is measurable |
| `candidates_removed_by_recheck` | int | yes | no | — | no | no | the number the index thought were visible and the authorization layer disagreed about. A persistently non-zero value is an index that is out of step with permissions and is the most important number this entity carries |
| `index_lag_seconds` | int | no | no | — | no | no |  |
| `duration_ms` | int | yes | no | — | no | no |  |
| `executed_at` | timestamptz | yes | yes | — | no | no |  |
| `surface` | enum | yes | no | — | no | no |  |
| `selected_result_position` | int | no | no | — | no | no | which result the person actually opened, if any. The single most useful relevance signal available and the only one that reflects what they meant |

## 2. Lifecycle

States: `executed`, `expired`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `executed` | GAP | GAP | GAP | entity-specific, see capability model |
| `expired` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. term is gated by view_sensitive on read. A search log is a record of what people were looking for and reading somebody else's is a disclosure in its own right.
2. candidates_removed_by_recheck is recorded on every query. A value that is persistently non-zero means the index and the permission model disagree, which is a correctness problem rather than a performance one.
3. A query record is written for every execution including those returning nothing, because an empty result is the most useful signal the product has about what it does not do.
4. Query records are retained for a bounded period and are never used to build a per-principal behavioural profile beyond relevance and capacity purposes, which is stated because the data trivially supports it.

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

- Permission matrix: `14-PERMISSIONS/search/search_query.md`
- Screen specifications: `11-UX/screens/search/search_query/`
- Test catalogue: `20-TESTING/search/search_query/`
