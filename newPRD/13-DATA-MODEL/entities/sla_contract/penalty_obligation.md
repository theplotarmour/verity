---
doc_id: ENT-PENALTY_OBLIGATION
title: Entity — Penalty Obligation
generated: true
source_model: _model/capabilities/sla_contract.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Penalty Obligation

*This document is generated. Edit `_model/capabilities/sla_contract.yaml`, not this file.*

**Capability/module:** `sla_contract` · **Owner scope:** `tenant`

A recorded consequence of a breach - what is owed, to whom, under which term, and whether it has been applied.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `contract_id` | uuid | yes | no | — | no | no |  |
| `service_level_id` | uuid | yes | no | — | no | no |  |
| `measurement_period_start` | date | yes | no | — | no | no |  |
| `measurement_period_end` | date | yes | no | — | no | no |  |
| `breach_count` | int | yes | no | — | no | no |  |
| `measured_value` | decimal | yes | no | — | no | no | the aggregated value that breached, so the obligation is self-explaining without recomputation |
| `target_value` | decimal | yes | no | — | no | no |  |
| `calculated_amount_minor` | money_minor | yes | no | — | no | yes |  |
| `capped_amount_minor` | money_minor | yes | no | — | no | yes | after the contract penalty cap, recorded separately so the difference between owed and payable is visible |
| `obligation_kind` | enum | yes | no | — | no | yes |  |
| `measurement_ids` | json | yes | no | — | no | no | flat list of the measurements that produced it, so a counterparty challenging the number can be shown every record behind it |
| `approved_by_principal_id` | uuid | no | no | — | no | no |  |
| `applied_reference` | string | no | no | — | no | no | the credit note or invoice adjustment the billing capability created, recorded here so the two systems reconcile |
| `waived_reason` | text | no | no | — | no | no |  |

## 2. Lifecycle

States: `calculated`, `pending_approval`, `approved`, `applied`, `waived`, `disputed`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `calculated` | GAP | GAP | GAP | entity-specific, see capability model |
| `pending_approval` | GAP | GAP | GAP | entity-specific, see capability model |
| `approved` | GAP | GAP | GAP | entity-specific, see capability model |
| `applied` | GAP | GAP | GAP | entity-specific, see capability model |
| `waived` | GAP | GAP | GAP | entity-specific, see capability model |
| `disputed` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. An obligation is never applied to money by this capability. It is raised, approved and then handed to the billing capability, which is the only place money moves.
2. capped_amount_minor may never exceed the contract's penalty_cap_minor for the period, aggregated across all obligations in that period.
3. measurement_ids is mandatory and non-empty. A penalty number a counterparty cannot trace to individual records is a number they will refuse to accept.
4. Waiving requires a reason and is separately reported. A silently waived penalty is indistinguishable from one that was never calculated.
5. Financial fields are gated by view_financial.

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

- Permission matrix: `14-PERMISSIONS/sla_contract/penalty_obligation.md`
- Screen specifications: `11-UX/screens/sla_contract/penalty_obligation/`
- Test catalogue: `20-TESTING/sla_contract/penalty_obligation/`
