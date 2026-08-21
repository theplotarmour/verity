---
doc_id: ENT-STOCK_LOCATION
title: Entity — Stock Location
generated: true
source_model: _model/capabilities/inventory.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Stock Location

*This document is generated. Edit `_model/capabilities/inventory.yaml`, not this file.*

**Capability/module:** `inventory` · **Owner scope:** `tenant`

A place stock is held - a store, a sub-store, a bin, a mobile holding. Distinct from a site because several stock locations exist within one site and stock moves between them.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `site_ref` | uuid | no | no | — | no | no | resolved through the org_structure port |
| `code` | string | yes | yes | tenant | no | no |  |
| `label` | string | yes | no | — | no | no |  |
| `parent_stock_location_id` | uuid | no | no | — | no | no |  |
| `path` | string | yes | no | — | no | no | materialised ancestor path, so a balance query across a subtree is a prefix match rather than a recursive walk |
| `kind` | enum | yes | no | — | no | no | in_transit and quarantine exist so that stock which is neither here nor there has somewhere to be. Without them, every transfer and every rejected receipt produces stock that has vanished |
| `allows_negative` | bool | yes | no | — | no | no | whether consumption may drive the balance below zero at this location. Default true, because refusing to record consumption that has already physically occurred is how a stock system becomes fiction |
| `counted_at` | timestamptz | no | no | — | no | no |  |
| `custodian_principal_id` | uuid | no | no | — | no | no | resolved through the principal_directory port. Who answers for what is here |
| `is_valued` | bool | yes | no | — | no | no | whether stock here contributes to the valuation. A consumption point frequently should not |

## 2. Lifecycle

States: `draft`, `active`, `suspended`, `retired`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `active` | False | True | True | In normal operational use. |
| `suspended` | GAP | GAP | GAP | entity-specific, see capability model |
| `retired` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. parent_stock_location_id must not create a cycle, and depth is bounded at stock_location_max_depth.
2. path is derived and never writable.
3. kind=in_transit locations may only be the source or destination of transfer movements. Any other movement into or out of them is a modelling error, because in-transit stock has no physical custodian.
4. A stock location may not be deleted while any movement references it. It is retired, because a historical movement must resolve to where it happened.

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

- Permission matrix: `14-PERMISSIONS/inventory/stock_location.md`
- Screen specifications: `11-UX/screens/inventory/stock_location/`
- Test catalogue: `20-TESTING/inventory/stock_location/`
