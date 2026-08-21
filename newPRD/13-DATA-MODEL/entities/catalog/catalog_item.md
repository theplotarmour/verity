---
doc_id: ENT-CATALOG_ITEM
title: Entity — Catalog Item
generated: true
source_model: _model/capabilities/catalog.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Catalog Item

*This document is generated. Edit `_model/capabilities/catalog.yaml`, not this file.*

**Capability/module:** `catalog` · **Owner scope:** `tenant`

One thing that can be sold, ordered, booked or consumed, with its classification, its unit and its lifecycle.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `sku` | string | yes | yes | tenant | no | no | the code people type, scan and say out loud |
| `name` | string | yes | no | — | no | no |  |
| `description` | text | no | no | — | no | no |  |
| `item_kind` | enum | yes | no | — | no | no | shapes rather than categories. What a tenant calls each is a terminology map concern and never appears here |
| `unit_of_measure` | string | yes | no | — | no | no | the unit quantities are expressed in. Mandatory, because a quantity with no unit is the most common cause of an order that costs ten times what was intended |
| `category_id` | uuid | no | no | — | no | no |  |
| `tax_classification` | string | no | no | — | no | no | the classification code a tax engine consumes through the tax_treatment port. Never a rate. An item carrying a rate is wrong after the next rate change and nobody notices until an authority does |
| `is_sellable` | bool | yes | no | — | no | no |  |
| `is_purchasable` | bool | yes | no | — | no | no |  |
| `is_stocked` | bool | yes | no | — | no | no | whether an inventory capability tracks it. Declared here and enforced there |
| `default_duration_minutes` | int | no | no | — | no | no | for time_based items, passed to booking and scheduling through the bookable_offering port |
| `required_qualification_keys` | json | no | no | — | no | no | flat list of scalars, passed to scheduling so that a service item can only be delivered by somebody competent to deliver it |
| `composition_id` | uuid | no | no | — | no | no |  |
| `image_ref` | string | no | no | — | no | no | reference through the evidence_capture port |
| `sort_weight` | int | yes | no | — | no | no |  |
| `version_number` | int | yes | no | — | no | no |  |
| `replaced_by_item_id` | uuid | no | no | — | no | no |  |

## 2. Lifecycle

States: `draft`, `active`, `unavailable`, `discontinued`, `archived`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `active` | False | True | True | In normal operational use. |
| `unavailable` | GAP | GAP | GAP | entity-specific, see capability model |
| `discontinued` | GAP | GAP | GAP | entity-specific, see capability model |
| `archived` | True | False | False | Retained, excluded from default lists and from all aggregate reports unless explicitly included. |

## 3. Invariants

1. unit_of_measure is mandatory. There is no sensible default; each is a different order of magnitude and guessing is how a quantity of two becomes two thousand.
2. item_kind=composite requires composition_id. A composite with nothing in it is an item whose cost cannot be derived and whose availability cannot be computed.
3. item_kind=time_based requires default_duration_minutes, because booking and scheduling both need a duration and neither can invent one.
4. An item is never edited in place once it has appeared on any transaction. A change is a new version, so that a historical line remains explainable.
5. tax_classification may be null only while is_sellable is false. A sellable item with no classification produces a document that a tax engine will refuse or, worse, will guess at.

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

- Permission matrix: `14-PERMISSIONS/catalog/catalog_item.md`
- Screen specifications: `11-UX/screens/catalog/catalog_item/`
- Test catalogue: `20-TESTING/catalog/catalog_item/`
