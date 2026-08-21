---
doc_id: ENT-GOODS_RECEIPT
title: Entity — Receipt
generated: true
source_model: _model/capabilities/procurement.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Receipt

*This document is generated. Edit `_model/capabilities/procurement.yaml`, not this file.*

**Capability/module:** `procurement` · **Owner scope:** `tenant`

The physical fact that something arrived, recorded before it is matched to anything, with who received it and in what condition.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `commitment_id` | uuid | no | no | — | no | no | nullable deliberately. Goods arrive without a purchase order reference constantly, and refusing to record them means they sit on a loading area or go straight onto a shelf unrecorded |
| `supplier_party_ref` | uuid | no | no | — | no | no |  |
| `stock_location_ref` | uuid | yes | no | — | no | no |  |
| `received_at` | timestamptz | yes | no | — | no | no |  |
| `received_by_principal_id` | uuid | yes | no | — | no | no |  |
| `supplier_document_ref` | string | no | no | — | no | no | the delivery note number, which is what a dispute is actually settled with |
| `lines` | json | yes | no | — | no | no | flat list per line - commitment_line_index or free text, item_ref, quantity_received, unit_of_measure, condition, batch_ref, expires_on, rejection_reason |
| `has_discrepancy` | bool | yes | no | — | no | no |  |
| `evidence_refs` | json | no | no | — | no | no | photographs of damage or of the delivery note, through the evidence_capture port |
| `created_offline` | bool | yes | no | — | no | no |  |

## 2. Lifecycle

States: `draft`, `submitted`, `matched`, `disputed`, `returned`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `submitted` | GAP | GAP | GAP | entity-specific, see capability model |
| `matched` | GAP | GAP | GAP | entity-specific, see capability model |
| `disputed` | GAP | GAP | GAP | entity-specific, see capability model |
| `returned` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. lines may not be empty and every quantity_received is positive. A receipt of nothing is a non-event.
2. A receipt is append-only once submitted. A correction is a further receipt with a negative-direction return line, never an edit, because the supplier holds a copy of the delivery note that was signed.
3. Rejected quantity is recorded on the receipt and does NOT create stock. It creates a return obligation, so that rejected goods are neither invisible nor counted as held.
4. Every receipt line either references a commitment line or is explicitly marked unmatched. There is no implicit matching by item, because two lines of the same item on one commitment are ordinary.

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

- Permission matrix: `14-PERMISSIONS/procurement/goods_receipt.md`
- Screen specifications: `11-UX/screens/procurement/goods_receipt/`
- Test catalogue: `20-TESTING/procurement/goods_receipt/`
