---
doc_id: ENT-ORDER
title: Entity — Order
generated: true
source_model: _model/capabilities/order.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Order

*This document is generated. Edit `_model/capabilities/order.yaml`, not this file.*

**Capability/module:** `order` · **Owner scope:** `tenant`

One commercial request from one party through one channel, with its lines, its totals and its fulfilment position.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `reference` | string | yes | yes | tenant | no | no |  |
| `channel` | enum | yes | no | — | no | no |  |
| `party_ref` | uuid | no | no | — | no | no | resolved through the party_directory port. Null for an anonymous in-person order, which must remain possible |
| `location_ref` | uuid | no | no | — | no | no | resolved through the org_structure port |
| `destination_ref` | uuid | no | no | — | no | no | where it is going, which may be a location, a party address or an internal point. Opaque and resolved through the fulfilment_target port |
| `requested_for_at` | timestamptz | no | no | — | no | no |  |
| `promised_for_at` | timestamptz | no | no | — | no | no | what was told to the party, which is frequently different from what was requested and is the number a complaint is measured against |
| `currency` | string | yes | no | — | no | yes |  |
| `subtotal_minor` | money_minor | yes | no | — | no | yes |  |
| `adjustment_total_minor` | money_minor | yes | no | — | no | yes | discounts, comps and surcharges, held separately from the subtotal so that a discount is never invisible inside a net figure |
| `tax_total_minor` | money_minor | no | no | — | no | yes | nullable rather than zero, because unknown tax and zero tax must never render identically |
| `total_minor` | money_minor | yes | no | — | no | yes |  |
| `paid_minor` | money_minor | yes | no | — | no | yes |  |
| `payment_state` | enum | yes | no | — | no | yes | independent of fulfilment state, because the two genuinely vary independently across the target segments |
| `split_of_order_id` | uuid | no | no | — | no | no |  |
| `merged_into_order_id` | uuid | no | no | — | no | no |  |
| `void_reason` | text | no | no | — | no | no |  |
| `voided_by_principal_id` | uuid | no | no | — | no | no |  |
| `taken_by_principal_id` | uuid | no | no | — | no | no | resolved through the principal_directory port |
| `notes` | text | no | no | — | no | no |  |
| `pricing_snapshot_at` | timestamptz | yes | no | — | no | no | the instant prices were resolved against. Frozen, so re-opening an order does not silently re-price it |

## 2. Lifecycle

States: `draft`, `confirmed`, `partially_fulfilled`, `fulfilled`, `closed`, `voided`, `on_hold`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `confirmed` | GAP | GAP | GAP | entity-specific, see capability model |
| `partially_fulfilled` | GAP | GAP | GAP | entity-specific, see capability model |
| `fulfilled` | GAP | GAP | GAP | entity-specific, see capability model |
| `closed` | GAP | GAP | GAP | entity-specific, see capability model |
| `voided` | GAP | GAP | GAP | entity-specific, see capability model |
| `on_hold` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. total_minor equals subtotal_minor plus adjustment_total_minor plus tax_total_minor where tax is known, and the invariant is checked on every write rather than trusted, because a total that disagrees with its lines is discovered by a customer.
2. An order with no lines may not leave draft. An empty confirmed order is a reference number attached to nothing.
3. Financial fields are gated by view_financial and are never offline_editable, with the deliberate exception described in the offline edge cases - line capture offline is permitted and pricing is re-resolved on sync.
4. void_reason and voided_by_principal_id are set together with the void transition. A void with no reason is indistinguishable from a deletion.
5. pricing_snapshot_at is frozen at first line capture and is only moved by an explicit re-price action which is separately audited.
6. payment_state is derived from paid_minor against total_minor and is never written directly, so the two can never disagree.

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

- Permission matrix: `14-PERMISSIONS/order/order.md`
- Screen specifications: `11-UX/screens/order/order/`
- Test catalogue: `20-TESTING/order/order/`
