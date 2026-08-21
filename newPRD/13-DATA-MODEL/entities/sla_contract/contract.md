---
doc_id: ENT-CONTRACT
title: Entity — Contract
generated: true
source_model: _model/capabilities/sla_contract.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Contract

*This document is generated. Edit `_model/capabilities/sla_contract.yaml`, not this file.*

**Capability/module:** `sla_contract` · **Owner scope:** `tenant`

The agreement with a counterparty - its period, its scope, its commercial terms and the service levels it obliges.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `reference` | string | yes | yes | tenant | no | no |  |
| `counterparty_ref` | uuid | yes | no | — | no | no | resolved through the party_directory port |
| `title` | string | yes | no | — | no | no |  |
| `starts_on` | date | yes | no | — | no | no |  |
| `ends_on` | date | no | no | — | no | no |  |
| `auto_renew` | bool | yes | no | — | no | no |  |
| `renewal_notice_days` | int | no | no | — | no | no |  |
| `scope_location_refs` | json | no | no | — | no | no | flat list of location references this contract covers, resolved through the org_structure port. Null means the whole tenant, which is explicit rather than implied by an empty list |
| `scope_expression` | text | no | no | — | no | no | an Expression narrowing which records fall under this contract where locations are insufficient. Statically cost-bounded |
| `billing_basis` | enum | yes | no | — | no | yes |  |
| `currency` | string | yes | no | — | no | yes |  |
| `value_minor` | money_minor | no | no | — | no | yes |  |
| `penalty_cap_minor` | money_minor | no | no | — | no | yes | the ceiling on penalties in a measurement period. Mandatory in practice and nullable in the model, because a contract genuinely without a cap exists and pretending otherwise would force a fictional number |
| `operating_calendar_ref` | uuid | no | no | — | no | no | the calendar targets are measured against, resolved through the location_calendar port. A contract calendar frequently differs from the location's own operating hours |
| `document_ref` | string | no | no | — | no | no | reference to the signed document through the evidence_capture port |
| `owner_principal_id` | uuid | no | no | — | no | no | resolved through the principal_directory port |
| `version_number` | int | yes | no | — | no | no |  |
| `supersedes_contract_id` | uuid | no | no | — | no | no |  |

## 2. Lifecycle

States: `draft`, `pending_signature`, `active`, `suspended`, `expiring`, `expired`, `terminated`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `pending_signature` | GAP | GAP | GAP | entity-specific, see capability model |
| `active` | False | True | True | In normal operational use. |
| `suspended` | GAP | GAP | GAP | entity-specific, see capability model |
| `expiring` | GAP | GAP | GAP | entity-specific, see capability model |
| `expired` | GAP | GAP | GAP | entity-specific, see capability model |
| `terminated` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. ends_on, where set, is on or after starts_on.
2. auto_renew true requires renewal_notice_days. A contract that renews itself with no notice period is one nobody can get out of.
3. Financial fields are gated by view_financial and are never offline_editable.
4. A contract is never edited after activation. A change is a new version superseding the old, because a target edited mid-period changes what was already measured.
5. scope_expression may only traverse relationships the evaluating principal can traverse, per kernel K16.
6. Two active contracts may not claim the same record under overlapping scope. Overlap is detected at activation and refused, because a record under two contracts has two targets and two penalty regimes.

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

- Permission matrix: `14-PERMISSIONS/sla_contract/contract.md`
- Screen specifications: `11-UX/screens/sla_contract/contract/`
- Test catalogue: `20-TESTING/sla_contract/contract/`
