---
doc_id: ENT-ASSET
title: Entity — Asset
generated: true
source_model: _model/capabilities/assets.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Asset

*This document is generated. Edit `_model/capabilities/assets.yaml`, not this file.*

**Capability/module:** `assets` · **Owner scope:** `tenant`

One identified thing the tenant is responsible for, with its identity, its custody, its condition and its position in a responsibility hierarchy.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `tag` | string | yes | yes | tenant | no | no | the identifier physically attached to the thing and read out loud. Mandatory and immutable, because a re-tagged asset is a new record with a documented predecessor rather than the same record wearing a new label |
| `name` | string | yes | no | — | no | no |  |
| `asset_class_id` | uuid | yes | no | — | no | no |  |
| `parent_asset_id` | uuid | no | no | — | no | no | responsibility hierarchy, not physical containment |
| `path` | string | yes | no | — | no | no | materialised ancestor path, so a subtree query is a prefix match |
| `location_ref` | uuid | no | no | — | no | no | where it is, resolved through the org_structure port |
| `custodian_principal_id` | uuid | no | no | — | no | no | who answers for it, resolved through the principal_directory port. Deliberately separate from location |
| `owning_party_ref` | uuid | no | no | — | no | no | null when the tenant owns it; otherwise whose it is, resolved through the party_directory port. A great deal of what a business maintains belongs to somebody else |
| `serial_reference` | string | no | no | — | no | no | the manufacturer's identifier, which is what a warranty claim is made against |
| `attributes` | json | no | no | — | no | no | pack-defined key-value scalars only, per the object-valued prohibition. This is the extension point that keeps kind-specific properties out of the core schema and it is the field DEC-K-001 will decide the future of |
| `acquired_on` | date | no | no | — | no | no |  |
| `acquisition_cost_minor` | money_minor | no | no | — | no | yes |  |
| `expected_life_months` | int | no | no | — | no | yes |  |
| `residual_value_minor` | money_minor | no | no | — | no | yes |  |
| `disposal_on` | date | no | no | — | no | no |  |
| `disposal_proceeds_minor` | money_minor | no | no | — | no | yes |  |
| `criticality` | enum | yes | no | — | no | no | drives escalation and plan priority without this capability knowing what an escalation is |
| `condition` | enum | yes | no | — | no | no | unknown is the honest initial value and is deliberately not good. An asset register that starts every record as good is a register nobody has looked at |
| `condition_assessed_at` | timestamptz | no | no | — | no | no | the age of a condition assessment is what tells you how much to trust it, and a condition with no date is an opinion of unknown vintage |
| `warranty_expires_on` | date | no | no | — | no | no |  |
| `warranty_party_ref` | uuid | no | no | — | no | no |  |

## 2. Lifecycle

States: `registered`, `in_service`, `in_storage`, `under_repair`, `impaired`, `lost`, `disposed`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `registered` | GAP | GAP | GAP | entity-specific, see capability model |
| `in_service` | GAP | GAP | GAP | entity-specific, see capability model |
| `in_storage` | GAP | GAP | GAP | entity-specific, see capability model |
| `under_repair` | GAP | GAP | GAP | entity-specific, see capability model |
| `impaired` | GAP | GAP | GAP | entity-specific, see capability model |
| `lost` | GAP | GAP | GAP | entity-specific, see capability model |
| `disposed` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. parent_asset_id must not create a cycle and depth is bounded at asset_hierarchy_max_depth.
2. path is derived and never writable.
3. tag is immutable. Re-tagging creates a new asset with a recorded predecessor, so the physical label and the record never silently diverge.
4. Financial fields are gated by view_financial and are never offline_editable. Condition, location and custody are none of those things, because a technician in the field must be able to record all three.
5. An asset in state disposed may not be the parent of a non-disposed asset. Disposing of something that other things hang off is a decision about those things too.
6. condition_assessed_at is required whenever condition is anything other than unknown.

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

- Permission matrix: `14-PERMISSIONS/assets/asset.md`
- Screen specifications: `11-UX/screens/assets/asset/`
- Test catalogue: `20-TESTING/assets/asset/`
