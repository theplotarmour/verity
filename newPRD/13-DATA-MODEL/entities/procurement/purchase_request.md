---
doc_id: ENT-PURCHASE_REQUEST
title: Entity — Purchase Request
generated: true
source_model: _model/capabilities/procurement.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Purchase Request

*This document is generated. Edit `_model/capabilities/procurement.yaml`, not this file.*

**Capability/module:** `procurement` · **Owner scope:** `tenant`

Somebody stating that something is needed, with what it is for and who approved it. Deliberately separate from the commitment to buy.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `reference` | string | yes | yes | tenant | no | no |  |
| `requested_by_principal_id` | uuid | yes | no | — | no | no | resolved through the principal_directory port |
| `location_ref` | uuid | no | no | — | no | no | resolved through the org_structure port |
| `needed_by` | date | no | no | — | no | no |  |
| `justification` | text | no | no | — | no | no |  |
| `source_capability_key` | string | no | no | — | no | no | which capability triggered it, for a request raised automatically from a low balance or from a work order |
| `source_ref` | uuid | no | no | — | no | no |  |
| `lines` | json | yes | no | — | no | no | flat ordered list, each entry a set of scalars - item_ref or free_text_description, quantity, unit_of_measure, estimated_unit_cost_minor, suggested_supplier_ref. Free text is permitted deliberately: a great deal of what a business buys is not in its catalogue and refusing to request it pushes the purchase outside the system entirely |
| `estimated_total_minor` | money_minor | no | no | — | no | yes |  |
| `currency` | string | yes | no | — | no | yes |  |
| `approval_route_ref` | uuid | no | no | — | no | no | resolved through the approval_chain port |
| `approved_by_principal_id` | uuid | no | no | — | no | no |  |
| `approved_at` | timestamptz | no | no | — | no | no |  |
| `rejection_reason` | text | no | no | — | no | no |  |

## 2. Lifecycle

States: `draft`, `submitted`, `partially_approved`, `approved`, `rejected`, `converted`, `cancelled`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `submitted` | GAP | GAP | GAP | entity-specific, see capability model |
| `partially_approved` | GAP | GAP | GAP | entity-specific, see capability model |
| `approved` | GAP | GAP | GAP | entity-specific, see capability model |
| `rejected` | GAP | GAP | GAP | entity-specific, see capability model |
| `converted` | GAP | GAP | GAP | entity-specific, see capability model |
| `cancelled` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. lines may not be empty.
2. Every line has either an item_ref or a free_text_description, and never both. Both would make it ambiguous which one the supplier is being asked for.
3. approved_by_principal_id may not equal requested_by_principal_id unless the tenant explicitly permits self-approval below a stated value, and that permission is a recorded configuration rather than an omission.
4. Financial fields are gated by view_financial. quantity and description are not, because the person who needs the thing must be able to describe it.

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

- Permission matrix: `14-PERMISSIONS/procurement/purchase_request.md`
- Screen specifications: `11-UX/screens/procurement/purchase_request/`
- Test catalogue: `20-TESTING/procurement/purchase_request/`
