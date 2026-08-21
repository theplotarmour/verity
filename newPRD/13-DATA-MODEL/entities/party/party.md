---
doc_id: ENT-PARTY
title: Entity — Party
generated: true
source_model: _model/capabilities/party.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Party

*This document is generated. Edit `_model/capabilities/party.yaml`, not this file.*

**Capability/module:** `party` · **Owner scope:** `tenant`

A person or an organisation Verity holds a record of, in any capacity.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `kind` | enum | yes | yes | — | no | no | immutable because every downstream assumption differs. A person becoming an organisation is a new party plus a relationship, not an edit |
| `display_name` | string | yes | no | — | no | no | the name shown everywhere. For an organisation this is the trading name, which is frequently not the legal name |
| `legal_name` | string | no | no | — | yes | no | held separately because invoices, contracts and statutory filings need the legal name while every screen needs the trading name |
| `primary_phone_e164` | e164 | no | no | — | yes | no |  |
| `primary_email` | citext | no | no | — | yes | no |  |
| `tax_registration_id` | string | no | no | tenant | yes | no | jurisdiction-specific registration number. Nullable because an unregistered counterparty is normal and refusing to record them would push the work into a spreadsheet |
| `tax_registration_kind` | enum | yes | no | — | no | no | drives document requirements downstream through the financial_document_sink port. The enum is jurisdiction-shaped but not jurisdiction-named, so a second jurisdiction is a terminology map rather than a schema change |
| `identity_document_kind` | enum | no | no | — | yes | no | for a person, which kind of identity document was verified |
| `identity_document_ref` | string | no | no | — | yes | no | a reference to the stored document through the evidence_capture port, never the document number itself. Storing a national identifier in a searchable column is how a breach becomes a catastrophe |
| `identity_verified_at` | timestamptz | no | no | — | yes | no |  |
| `credit_limit_minor` | money_minor | no | no | — | no | yes |  |
| `payment_terms_days` | int | no | no | — | no | yes |  |
| `risk_flag` | enum | yes | no | — | no | yes | blocked prevents new commitments but never hides history |
| `source` | enum | yes | no | — | no | no |  |
| `created_at` | timestamptz | yes | yes | — | no | no |  |
| `created_by_principal_id` | uuid | yes | no | — | no | no | resolved through the principal_directory port |
| `merged_into_party_id` | uuid | no | no | — | no | no | set when this party was absorbed by a merge. The row is retained forever so that historical references still resolve |
| `search_projection_hash` | string | no | no | — | no | no | computed; changes when any indexed field changes, so the search capability can detect staleness without diffing every field |

## 2. Lifecycle

States: `draft`, `active`, `dormant`, `blocked`, `merged`, `archived`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `active` | False | True | True | In normal operational use. |
| `dormant` | GAP | GAP | GAP | entity-specific, see capability model |
| `blocked` | GAP | GAP | GAP | entity-specific, see capability model |
| `merged` | GAP | GAP | GAP | entity-specific, see capability model |
| `archived` | True | False | False | Retained, excluded from default lists and from all aggregate reports unless explicitly included. |

## 3. Invariants

1. A party with kind=person and no contactable channel and no identity document is a name in a box. Permitted at creation, because that is genuinely how a lead arrives, but it may not be bound to any relationship until at least one identifying attribute exists.
2. tax_registration_id is unique within a tenant among non-merged parties. Two live parties with one registration number is the single most expensive duplicate a business can have, because it splits their ledger.
3. merged_into_party_id is set exactly when the party is in state merged. A party pointing at a merge target while still active is a half-finished merge and is rejected.
4. Financial fields are gated by view_financial and are never offline_editable. A credit limit changed on a device that has been offline for two days is a credit limit set against stale information.

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

- Permission matrix: `14-PERMISSIONS/party/party.md`
- Screen specifications: `11-UX/screens/party/party/`
- Test catalogue: `20-TESTING/party/party/`
