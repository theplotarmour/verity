---
doc_id: ENT-PAYMENT_RECEIPT
title: Entity — Payment Receipt
generated: true
source_model: _model/capabilities/billing.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Payment Receipt

*This document is generated. Edit `_model/capabilities/billing.yaml`, not this file.*

**Capability/module:** `billing` · **Owner scope:** `tenant`

Money received, recorded before it is allocated, because a receipt with no obvious invoice is common and refusing to record it loses the money.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `counterparty_ref` | uuid | no | no | — | no | no | nullable, because a receipt frequently arrives with no identifiable payer and must still be recorded |
| `received_at` | timestamptz | yes | no | — | no | no |  |
| `amount_minor` | money_minor | yes | no | — | no | yes |  |
| `currency` | string | yes | no | — | no | yes |  |
| `method` | enum | yes | no | — | no | yes |  |
| `external_reference` | string | no | no | — | no | yes | the bank or provider reference. Unique per tenant per method where present, which is the control that catches a receipt recorded twice |
| `payer_narrative` | text | no | no | — | no | no | whatever the payer wrote on the transfer, which is frequently the only clue to what it is for and is why allocation cannot be automatic |
| `allocated_minor` | money_minor | yes | no | — | no | yes |  |
| `recorded_by_principal_id` | uuid | yes | no | — | no | no |  |
| `reversed_reason` | text | no | no | — | no | yes |  |

## 2. Lifecycle

States: `unallocated`, `partially_allocated`, `allocated`, `reversed`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `unallocated` | GAP | GAP | GAP | entity-specific, see capability model |
| `partially_allocated` | GAP | GAP | GAP | entity-specific, see capability model |
| `allocated` | GAP | GAP | GAP | entity-specific, see capability model |
| `reversed` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. amount_minor is positive. A refund is a separate record with its own authority, never a negative receipt.
2. allocated_minor may never exceed amount_minor.
3. unique(tenant_id, method, external_reference) where external_reference is present. This is what catches a bank line imported twice, which otherwise appears as a customer having paid twice.
4. A receipt is never deleted. A receipt recorded in error is reversed with a reason, so that the bank reconciliation still balances.
5. Financial fields are gated by view_financial. The payer narrative is not, because it is frequently the operational clue to which job the money is for.

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

- Permission matrix: `14-PERMISSIONS/billing/payment_receipt.md`
- Screen specifications: `11-UX/screens/billing/payment_receipt/`
- Test catalogue: `20-TESTING/billing/payment_receipt/`
