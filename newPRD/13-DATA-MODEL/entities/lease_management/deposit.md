---
doc_id: ENT-DEPOSIT
title: Entity — Deposit
generated: true
source_model: _model/capabilities/lease_management.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Deposit

*This document is generated. Edit `_model/capabilities/lease_management.yaml`, not this file.*

**Capability/module:** `lease_management` · **Owner scope:** `tenant`

Money held on trust against a lease, tracked separately from revenue, with its return obligation and its deadline.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `lease_id` | uuid | yes | no | — | no | no |  |
| `required_amount_minor` | money_minor | yes | no | — | no | yes |  |
| `held_amount_minor` | money_minor | yes | no | — | no | yes |  |
| `held_since` | date | no | no | — | no | no |  |
| `holding_arrangement` | enum | yes | no | — | no | no | where the money actually is. Materially different obligations follow from each and an unstated arrangement is one nobody can discharge correctly |
| `scheme_reference` | string | no | no | — | yes | no |  |
| `return_due_by` | date | no | no | — | no | no |  |
| `returned_amount_minor` | money_minor | yes | no | — | no | yes |  |
| `applied_amount_minor` | money_minor | yes | no | — | no | yes | applied against arrears or reinstatement, only by an explicit act |
| `application_reason` | text | no | no | — | no | yes |  |
| `disputed` | bool | yes | no | — | no | no |  |

## 2. Lifecycle

States: `required`, `held`, `partially_returned`, `returned`, `applied`, `disputed`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `required` | GAP | GAP | GAP | entity-specific, see capability model |
| `held` | GAP | GAP | GAP | entity-specific, see capability model |
| `partially_returned` | GAP | GAP | GAP | entity-specific, see capability model |
| `returned` | GAP | GAP | GAP | entity-specific, see capability model |
| `applied` | GAP | GAP | GAP | entity-specific, see capability model |
| `disputed` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. returned_amount_minor plus applied_amount_minor may never exceed held_amount_minor.
2. A deposit is never netted against arrears automatically. Application is an explicit act with a reason, because applying somebody else's money to a debt they dispute is the act most likely to be challenged.
3. Deposit money is tracked separately from revenue at every point and never appears in a revenue figure. This is restated in the reporting projections rather than trusted to be remembered.
4. return_due_by is set at lease end and is a real deadline. A deposit held past it with no dispute recorded is money held with no stated basis.
5. Financial fields are gated by view_financial, and scheme_reference is additionally gated by view_sensitive.

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

- Permission matrix: `14-PERMISSIONS/lease_management/deposit.md`
- Screen specifications: `11-UX/screens/lease_management/deposit/`
- Test catalogue: `20-TESTING/lease_management/deposit/`
