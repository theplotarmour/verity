---
doc_id: ENT-PRICE_RULE
title: Entity — Price Rule
generated: true
source_model: _model/capabilities/catalog.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Price Rule

*This document is generated. Edit `_model/capabilities/catalog.yaml`, not this file.*

**Capability/module:** `catalog` · **Owner scope:** `tenant`

What an item costs, to whom, when, at what quantity and under which agreement - with an explicit precedence so that two applicable prices never produce an ambiguous answer.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `item_id` | uuid | no | no | — | no | no | null means the rule applies to a whole category |
| `category_id` | uuid | no | no | — | no | no |  |
| `scope_kind` | enum | yes | no | — | no | no |  |
| `scope_ref` | uuid | no | no | — | no | no | the location, party, contract or channel this applies to, resolved through the relevant port. Null for list price |
| `currency` | string | yes | no | — | no | yes |  |
| `amount_minor` | money_minor | no | no | — | no | yes |  |
| `percent_of_list` | decimal | no | no | — | no | yes | an alternative to an absolute amount, for agreements expressed as a discount |
| `min_quantity` | decimal | no | no | — | no | no |  |
| `max_quantity` | decimal | no | no | — | no | no |  |
| `effective_from` | timestamptz | yes | no | — | no | no |  |
| `effective_to` | timestamptz | no | no | — | no | no |  |
| `precedence` | int | yes | no | — | no | no | MANDATORY. Where two rules both apply, the lower number wins, and ties are a validation error rather than a silent choice. This single field is what stops pricing being a source of arguments nobody can settle |
| `tax_inclusive` | bool | yes | no | — | no | yes | whether the amount already contains tax. Mandatory and explicit, because the same number means two different things and getting it wrong is a systematic error across every line |
| `rounding_rule` | enum | yes | no | — | no | yes |  |
| `source` | enum | yes | no | — | no | no |  |

## 2. Lifecycle

States: `draft`, `scheduled`, `active`, `expired`, `superseded`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `scheduled` | GAP | GAP | GAP | entity-specific, see capability model |
| `active` | False | True | True | In normal operational use. |
| `expired` | GAP | GAP | GAP | entity-specific, see capability model |
| `superseded` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. Exactly one of amount_minor and percent_of_list is set.
2. precedence is mandatory and has no default. Two rules applying at the same precedence to the same item, scope and period is a validation error detected at save time, not resolved arbitrarily at price time.
3. effective_to, where set, is after effective_from.
4. A rule is never edited after any transaction has resolved against it. A change is a new rule with a new effective period, so that a historical price remains reproducible.
5. min_quantity and max_quantity together may not leave a gap in a quantity ladder for the same item and scope. A gap means a quantity with no price, which surfaces as an order that cannot be completed.
6. Financial fields are gated by view_financial. A principal without it sees that an item is priced and not what it costs.

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

- Permission matrix: `14-PERMISSIONS/catalog/price_rule.md`
- Screen specifications: `11-UX/screens/catalog/price_rule/`
- Test catalogue: `20-TESTING/catalog/price_rule/`
