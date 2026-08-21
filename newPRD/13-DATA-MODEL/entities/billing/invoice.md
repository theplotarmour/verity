---
doc_id: ENT-INVOICE
title: Entity — Invoice
generated: true
source_model: _model/capabilities/billing.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Invoice

*This document is generated. Edit `_model/capabilities/billing.yaml`, not this file.*

**Capability/module:** `billing` · **Owner scope:** `tenant`

A document asking a counterparty for money, with its lines, its tax, its legal registration status and its payment position. Never edited once issued.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `document_number` | string | yes | yes | tenant | no | no | allocated from a gapless per-series sequence at ISSUE, not at draft. A gap in an invoice series is a question from an auditor, unlike the work order reference where gaps are harmless |
| `series_key` | string | yes | yes | — | no | no |  |
| `counterparty_ref` | uuid | yes | yes | — | no | no |  |
| `contract_ref` | uuid | no | yes | — | no | no |  |
| `issue_date` | date | no | yes | — | no | no |  |
| `due_date` | date | no | no | — | no | yes |  |
| `period_start` | date | no | no | — | no | no |  |
| `period_end` | date | no | no | — | no | no |  |
| `currency` | string | yes | yes | — | no | yes |  |
| `subtotal_minor` | money_minor | yes | no | — | no | yes |  |
| `tax_total_minor` | money_minor | no | no | — | no | yes | nullable rather than zero, so unknown tax and no tax never render identically |
| `total_minor` | money_minor | yes | no | — | no | yes |  |
| `allocated_minor` | money_minor | yes | no | — | no | yes |  |
| `disputed_minor` | money_minor | yes | no | — | no | yes |  |
| `written_off_minor` | money_minor | yes | no | — | no | yes |  |
| `registration_required` | bool | yes | no | — | no | no | whether this document must be registered externally to be legally valid, derived from tenant configuration and counterparty status at issue |
| `registration_reference` | string | no | no | — | no | no | the reference returned by the external registry. Until it is present the document is NOT a valid tax invoice and must say so on its face |
| `registration_qr` | text | no | no | — | no | no |  |
| `registration_deadline_at` | timestamptz | no | no | — | no | no | from the configured reporting window. A document past this deadline may be permanently unregistrable, which makes it uncollectable as a tax invoice |
| `registration_failure_reason` | text | no | no | — | no | no |  |
| `document_ref` | string | no | no | — | no | no | the rendered document through the evidence_capture port |
| `sent_at` | timestamptz | no | no | — | no | no |  |
| `sent_via` | enum | yes | no | — | no | no |  |
| `credit_of_invoice_id` | uuid | no | no | — | no | no | set on a credit note, pointing at the invoice it credits |
| `document_kind` | enum | yes | yes | — | no | no |  |

## 2. Lifecycle

States: `draft`, `issued`, `registered`, `registration_failed`, `sent`, `part_paid`, `paid`, `overdue`, `disputed`, `written_off`, `cancelled`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `issued` | GAP | GAP | GAP | entity-specific, see capability model |
| `registered` | GAP | GAP | GAP | entity-specific, see capability model |
| `registration_failed` | GAP | GAP | GAP | entity-specific, see capability model |
| `sent` | GAP | GAP | GAP | entity-specific, see capability model |
| `part_paid` | GAP | GAP | GAP | entity-specific, see capability model |
| `paid` | GAP | GAP | GAP | entity-specific, see capability model |
| `overdue` | GAP | GAP | GAP | entity-specific, see capability model |
| `disputed` | GAP | GAP | GAP | entity-specific, see capability model |
| `written_off` | GAP | GAP | GAP | entity-specific, see capability model |
| `cancelled` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. No field except payment, dispute, write-off and registration fields may change after issue. There is no edit path. A correction is a credit note plus a new invoice.
2. document_number is allocated at issue from a gapless per-series sequence inside the issuing transaction. Unlike an operational reference, a gap in an invoice series is a question an auditor asks, so the sequence is transactional and a rolled-back issue reuses the number.
3. A document with registration_required true and no registration_reference must be rendered with an explicit not-tax-valid marker, in every channel it is delivered through, and must not be described as an invoice in any covering message.
4. allocated_minor plus written_off_minor may never exceed total_minor. Over-allocation is an unallocated receipt, not an invoice field.
5. total_minor equals the sum of its lines plus tax, asserted on every write rather than trusted.
6. document_kind=credit_note requires credit_of_invoice_id and a negative-direction effect expressed by the kind rather than by a negative total, so that a credit note is never mistaken for an invoice by sign.
7. Financial fields are gated by view_financial. document_number, counterparty, period and line descriptions are not, because an operations manager fielding a query about an invoice needs to identify it.

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

- Permission matrix: `14-PERMISSIONS/billing/invoice.md`
- Screen specifications: `11-UX/screens/billing/invoice/`
- Test catalogue: `20-TESTING/billing/invoice/`
