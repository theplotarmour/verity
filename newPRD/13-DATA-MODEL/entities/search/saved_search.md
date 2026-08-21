---
doc_id: ENT-SAVED_SEARCH
title: Entity — Saved Search
generated: true
source_model: _model/capabilities/search.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Saved Search

*This document is generated. Edit `_model/capabilities/search.yaml`, not this file.*

**Capability/module:** `search` · **Owner scope:** `tenant`

A stored query somebody returns to, which must return THEIR results rather than its author's.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `owner_principal_id` | uuid | yes | no | — | no | no |  |
| `label` | string | yes | no | — | no | no |  |
| `term` | text | no | no | — | no | no |  |
| `filters` | json | no | no | — | no | no |  |
| `entity_keys` | json | yes | no | — | no | no |  |
| `shared_with_role_keys` | json | no | no | — | no | no | shared by role rather than by person, per the same reasoning as notification audiences - a search shared with a named individual dies when they leave |
| `is_pinned` | bool | yes | no | — | no | no |  |
| `last_run_at` | timestamptz | no | no | — | no | no |  |
| `run_count` | int | yes | no | — | no | no |  |
| `result_count_at_last_run` | int | no | no | — | no | no |  |
| `notify_on_new_results` | bool | yes | no | — | no | no |  |

## 2. Lifecycle

States: `active`, `broken`, `archived`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `active` | False | True | True | In normal operational use. |
| `broken` | GAP | GAP | GAP | entity-specific, see capability model |
| `archived` | True | False | False | Retained, excluded from default lists and from all aggregate reports unless explicitly included. |

## 3. Invariants

1. A saved search stores a QUERY and never a result set. It is executed under the scope of whoever runs it, so a search shared with somebody of narrower scope returns their results and never its author's.
2. shared_with_role_keys grants the right to run the search, never the right to see its author's results. The distinction is the whole safety property of sharing.
3. notify_on_new_results requires the notification port and is evaluated per subscriber under that subscriber's own scope, so a subscriber is never told about something they cannot open.
4. A saved search whose filters reference an entity the runner cannot access executes over the entities they can, and states which were excluded. Silently narrowing produces a result count somebody will misread as a real number.

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

- Permission matrix: `14-PERMISSIONS/search/saved_search.md`
- Screen specifications: `11-UX/screens/search/saved_search/`
- Test catalogue: `20-TESTING/search/saved_search/`
