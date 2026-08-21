---
doc_id: ENT-COMPOSITION
title: Entity — Composition
generated: true
source_model: _model/capabilities/catalog.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Composition

*This document is generated. Edit `_model/capabilities/catalog.yaml`, not this file.*

**Capability/module:** `catalog` · **Owner scope:** `tenant`

A versioned statement of what an item is made of or consumes, used to derive cost, to decide availability from components, and to drive stock movement.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `parent_item_id` | uuid | yes | no | — | no | no |  |
| `version_number` | int | yes | no | — | no | no |  |
| `components` | json | yes | no | — | no | no | ordered flat list, each entry a set of scalars - component_item_sku, quantity, unit_of_measure, is_optional, yield_percent. Flat rather than nested, per the object-valued prohibition, so a composition diff is readable and a nested composition is expressed by the component item having its own composition rather than by nesting here |
| `output_quantity` | decimal | yes | no | — | no | no | how much the composition produces. Explicit, because a composition that produces ten units and one that produces one are otherwise indistinguishable and the cost differs by a factor of ten |
| `output_unit_of_measure` | string | yes | no | — | no | no |  |
| `max_depth_resolved` | int | yes | no | — | no | no | how deep the component tree went when last resolved, so an unbounded recursion is detected rather than encountered |
| `effective_from` | timestamptz | yes | no | — | no | no |  |
| `notes` | text | no | no | — | no | no |  |

## 2. Lifecycle

States: `draft`, `published`, `superseded`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `published` | GAP | GAP | GAP | entity-specific, see capability model |
| `superseded` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. A composition may not include its own parent item at any depth. Cycle detection runs at publication, not at resolution, so a cycle is a save-time error rather than a runtime hang.
2. Component resolution depth is bounded at composition_max_depth. Beyond it, publication is refused with the path named.
3. output_quantity must be positive. A composition producing nothing has no derivable unit cost.
4. A published composition is immutable. A change is a new version, because changing what something is made of must not change what was sold last month.
5. Every component names a unit_of_measure explicitly, even where it matches the component item's own. Inheriting the unit silently is how a recipe in grams becomes a recipe in kilograms.

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

- Permission matrix: `14-PERMISSIONS/catalog/composition.md`
- Screen specifications: `11-UX/screens/catalog/composition/`
- Test catalogue: `20-TESTING/catalog/composition/`
