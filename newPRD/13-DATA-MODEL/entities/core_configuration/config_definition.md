---
doc_id: ENT-CONFIG_DEFINITION
title: Entity — Configuration Definition
generated: true
source_model: _model/capabilities/core_configuration.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Configuration Definition

*This document is generated. Edit `_model/capabilities/core_configuration.yaml`, not this file.*

**Capability/module:** `core_configuration` · **Owner scope:** `platform`

The declaration of a setting - its type, its default, its validation, the lowest scope that may set it, and what changing it costs.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `config_key` | string | yes | yes | global | no | no | namespaced by the declaring capability, for example work_order.auto_close_days, so two capabilities cannot collide |
| `declaring_capability_key` | string | yes | yes | — | no | no |  |
| `value_type` | enum | yes | yes | — | no | no | a closed set drawn from the kernel FieldType set. json_list is permitted for lists of scalars only; a list of objects is a model, not a setting |
| `enum_values` | json | no | no | — | no | no | required when value_type is enum |
| `default_value` | text | yes | no | — | no | no | serialised per value_type. Mandatory - kernel K07 forbids a shipped rule or setting with no default |
| `lowest_settable_scope` | enum | yes | no | — | no | no |  |
| `validation_expression` | text | no | no | — | no | no | an Expression evaluated at set time, statically cost-bounded |
| `range_min` | text | no | no | — | no | no |  |
| `range_max` | text | no | no | — | no | no |  |
| `change_impact` | enum | yes | no | — | no | no |  |
| `nullable_meaning` | text | no | no | — | no | no | MANDATORY where null is a legal value, stating what null MEANS - for example null means never expire. A setting where null is legal and undocumented is a three-valued logic bug waiting to be written |
| `label` | string | yes | no | — | no | no |  |
| `help_text` | text | yes | no | — | no | no | mandatory. A setting an administrator cannot understand is a setting they will set wrong, and every wrong setting becomes a support ticket |
| `decision_question` | text | yes | no | — | no | no | the business question this setting answers, phrased as an operator would ask it. This is what the settings screen groups by, not the capability name |
| `sensitive` | bool | yes | no | — | no | no | gated by view_sensitive when true, for example an integration endpoint |
| `financial` | bool | yes | no | — | no | no |  |
| `deprecated_at` | timestamptz | no | no | — | no | no |  |
| `replaced_by_config_key` | string | no | no | — | no | no |  |

## 2. Lifecycle

States: `draft`, `active`, `deprecated`, `retired`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `active` | False | True | True | In normal operational use. |
| `deprecated` | GAP | GAP | GAP | entity-specific, see capability model |
| `retired` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. value_type may never change. A type change is a new config_key plus a migration mapping, exactly as it is for a field. This is in the composition model's forbidden_overrides list and is restated here because configuration is where the temptation is strongest.
2. A setting whose change_impact is requires_migration or requires_staging may never be written directly in production by a tenant principal. It routes through the staging-first path.
3. Deprecating a definition never deletes stored values. The values remain readable so that a tenant can be shown what they had before the replacement setting took over.
4. lowest_settable_scope=kernel_default means the value is a platform constant that appears in the configuration surface as read-only rather than being hidden. Hidden constants are how an operator concludes the software is doing something arbitrary.

## 4. Deletion and retention semantics

| Question | Answer |
|---|---|
| Soft or hard delete | Soft by default (`deleted` reserved state). Hard delete only via retention job or a data-subject erasure request. |
| What happens to children | Blocked if any child row in a non-terminal state references this row. The user is shown the blocking rows, not a generic error. |
| What happens to audit rows | Retained. Audit rows are never cascade-deleted. |
| What happens to emitted events | Retained. Events are immutable history. |
| Archive vs delete | Archive removes from default lists and aggregate reports; delete removes from all reads except audit and legal hold. |

## 5. Tenant isolation

Tenancy mode: `platform_scoped`. Enforced by Postgres row-level security on `tenant_id`, not by application `WHERE` clauses. Every query runs under a role that cannot see other tenants even if the application layer forgets a predicate. Cross-tenant reads require a platform archetype and are audited under `security`.

## 6. Related documents

- Permission matrix: `14-PERMISSIONS/core_configuration/config_definition.md`
- Screen specifications: `11-UX/screens/core_configuration/config_definition/`
- Test catalogue: `20-TESTING/core_configuration/config_definition/`
