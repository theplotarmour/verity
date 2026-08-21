---
doc_id: ENT-SUPPLIER_INVOICE
title: Entity — Supplier Invoice
generated: true
source_model: _model/capabilities/procurement.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Supplier Invoice

*This document is generated. Edit `_model/capabilities/procurement.yaml`, not this file.*

**Capability/module:** `procurement` · **Owner scope:** `tenant`

A supplier's claim for payment, recorded as a claim and only becoming a liability once it matches a receipt and a commitment.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `supplier_party_ref` | uuid | yes | no | — | no | no |  |
| `supplier_invoice_number` | string | yes | no | — | no | no | the supplier's own number. Unique per supplier per tenant, which is the single control that catches most duplicate invoices |
| `invoice_date` | date | yes | no | — | no | no |  |
| `due_date` | date | no | no | — | no | yes |  |
| `commitment_id` | uuid | no | no | — | no | no |  |
| `lines` | json | yes | no | — | no | no | flat list per line - description, quantity, unit_price_minor, tax_classification, commitment_line_index |
| `currency` | string | yes | no | — | no | yes |  |
| `subtotal_minor` | money_minor | yes | no | — | no | yes |  |
| `tax_total_minor` | money_minor | no | no | — | no | yes |  |
| `total_minor` | money_minor | yes | no | — | no | yes |  |
| `document_ref` | string | no | no | — | no | no | the scanned or received document through the evidence_capture port |
| `match_variance_minor` | money_minor | no | no | — | no | yes |  |
| `match_variance_reason` | text | no | no | — | no | no |  |
| `approved_for_payment_by_principal_id` | uuid | no | no | — | no | yes |  |
| `payment_reference` | string | no | no | — | no | yes | set by the payment capability. This capability never moves money |

## 2. Lifecycle

States: `received`, `matching`, `matched`, `variance_hold`, `approved_for_payment`, `paid`, `rejected`, `credited`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `received` | GAP | GAP | GAP | entity-specific, see capability model |
| `matching` | GAP | GAP | GAP | entity-specific, see capability model |
| `matched` | GAP | GAP | GAP | entity-specific, see capability model |
| `variance_hold` | GAP | GAP | GAP | entity-specific, see capability model |
| `approved_for_payment` | GAP | GAP | GAP | entity-specific, see capability model |
| `paid` | GAP | GAP | GAP | entity-specific, see capability model |
| `rejected` | GAP | GAP | GAP | entity-specific, see capability model |
| `credited` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. unique(tenant_id, supplier_party_ref, supplier_invoice_number). This one constraint catches the majority of duplicate invoices, which is the most common way a business pays for the same thing twice.
2. An invoice is a claim until matched. It never appears as a liability, an accrual or a payable until it reaches matched or accepted-with-variance.
3. Financial fields are gated by view_financial. The supplier and the invoice number are not, so that a receiving clerk can check whether a document has already been recorded.
4. An invoice may not be approved for payment by the principal who recorded it where the tenant requires separation, and that separation is a recorded configuration rather than an assumption.

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

- Permission matrix: `14-PERMISSIONS/procurement/supplier_invoice.md`
- Screen specifications: `11-UX/screens/procurement/supplier_invoice/`
- Test catalogue: `20-TESTING/procurement/supplier_invoice/`
