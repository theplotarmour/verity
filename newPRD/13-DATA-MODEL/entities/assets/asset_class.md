---
doc_id: ENT-ASSET_CLASS
title: Entity — Asset Class
generated: true
source_model: _model/capabilities/assets.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Asset Class

*This document is generated. Edit `_model/capabilities/assets.yaml`, not this file.*

**Capability/module:** `assets` · **Owner scope:** `tenant`

The definition of a kind of asset - what attributes it must carry, what plans apply to it by default, how it depreciates and what meters it has.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `key` | string | yes | yes | tenant | no | no |  |
| `label` | string | yes | no | — | no | no |  |
| `parent_class_id` | uuid | no | no | — | no | no |  |
| `required_attribute_keys` | json | no | no | — | no | no | flat list of scalars that an asset of this class must carry before it can be commissioned |
| `meter_definitions` | json | no | no | — | no | no | flat list of scalars per meter - key, label, unit, is_cumulative, rollover_value. is_cumulative is mandatory because a cumulative meter and a periodic one behave completely differently on every reading |
| `default_plan_ids` | json | no | no | — | no | no | flat list of maintenance plan references applied to new assets of this class |
| `depreciation_method` | enum | yes | no | — | no | yes |  |
| `default_life_months` | int | no | no | — | no | yes |  |
| `warranty_default_months` | int | no | no | — | no | no |  |
| `criticality_default` | enum | yes | no | — | no | no |  |
| `source_pack_key` | string | no | no | — | no | no |  |

## 2. Lifecycle

States: `draft`, `active`, `archived`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `active` | False | True | True | In normal operational use. |
| `archived` | True | False | False | Retained, excluded from default lists and from all aggregate reports unless explicitly included. |

## 3. Invariants

1. Class hierarchy depth is bounded at asset_class_max_depth and may not contain a cycle.
2. depreciation_method=usage_based requires at least one cumulative meter definition. Depreciating by usage with nothing measuring usage is a calculation with no input.
3. depreciation_method other than none requires default_life_months, or every asset of the class to carry its own expected_life_months. A depreciation method with no life is not a method.
4. Editing a class never retroactively invalidates existing assets. Newly required attributes are reported as missing on existing assets rather than blocking them, because blocking a commissioned asset because somebody added a field is how a register stops being maintained.

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

- Permission matrix: `14-PERMISSIONS/assets/asset_class.md`
- Screen specifications: `11-UX/screens/assets/asset_class/`
- Test catalogue: `20-TESTING/assets/asset_class/`
