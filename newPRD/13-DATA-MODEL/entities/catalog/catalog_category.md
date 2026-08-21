---
doc_id: ENT-CATALOG_CATEGORY
title: Entity — Category
generated: true
source_model: _model/capabilities/catalog.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Category

*This document is generated. Edit `_model/capabilities/catalog.yaml`, not this file.*

**Capability/module:** `catalog` · **Owner scope:** `tenant`

A grouping used for navigation, for reporting and as a scope for price rules. Deliberately a shallow tree.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `key` | string | yes | yes | tenant | no | no |  |
| `label` | string | yes | no | — | no | no |  |
| `parent_category_id` | uuid | no | no | — | no | no |  |
| `path` | string | yes | no | — | no | no | materialised ancestor path, so a category-scoped price rule resolves by prefix match rather than by recursive walk |
| `sort_weight` | int | yes | no | — | no | no |  |
| `default_tax_classification` | string | no | no | — | no | no | inherited by items that do not set their own, and always resolvable to an explicit value on the item at publication rather than left as an inheritance at transaction time |

## 2. Lifecycle

States: `active`, `retired`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `active` | False | True | True | In normal operational use. |
| `retired` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. Depth is bounded at category_max_depth. An unbounded category tree makes category-scoped price resolution unbounded on a hot path.
2. path is derived and never writable.
3. A category may not be deleted while any item references it. Categories are retired, because a historical report grouped by category must still resolve.

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

- Permission matrix: `14-PERMISSIONS/catalog/catalog_category.md`
- Screen specifications: `11-UX/screens/catalog/catalog_category/`
- Test catalogue: `20-TESTING/catalog/catalog_category/`
