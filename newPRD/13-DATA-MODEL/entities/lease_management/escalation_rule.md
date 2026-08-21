---
doc_id: ENT-ESCALATION_RULE
title: Entity — Escalation Rule
generated: true
source_model: _model/capabilities/lease_management.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Escalation Rule

*This document is generated. Edit `_model/capabilities/lease_management.yaml`, not this file.*

**Capability/module:** `lease_management` · **Owner scope:** `tenant`

How and when a charge changes over a lease term, expressed as a rule with a date rather than as a number somebody remembers.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `lease_id` | uuid | yes | no | — | no | no |  |
| `applies_to_charge_kind` | enum | yes | no | — | no | no |  |
| `method` | enum | yes | no | — | no | no |  |
| `percentage` | decimal | no | no | — | no | yes |  |
| `amount_minor` | money_minor | no | no | — | no | yes |  |
| `index_key` | string | no | no | — | no | no | the published index the escalation follows. Held as a key rather than a value, because the value is external, is published late, and is sometimes revised |
| `index_lag_months` | int | no | no | — | no | no | how far back the reference index value is taken, because the current period's index is not published in time to bill |
| `floor_percentage` | decimal | no | no | — | no | yes |  |
| `cap_percentage` | decimal | no | no | — | no | yes |  |
| `steps` | json | no | no | — | no | no | flat list of effective date and amount pairs for a stepped schedule |
| `effective_dates` | json | yes | no | — | no | no | flat list of dates on which this rule applies |
| `last_applied_on` | date | no | no | — | no | no |  |
| `next_due_on` | date | no | no | — | no | no |  |
| `requires_agreement` | bool | yes | no | — | no | no | true for an open market review, where the new amount is negotiated rather than computed |

## 2. Lifecycle

States: `scheduled`, `due`, `applied`, `held`, `agreed_pending`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `scheduled` | GAP | GAP | GAP | entity-specific, see capability model |
| `due` | GAP | GAP | GAP | entity-specific, see capability model |
| `applied` | GAP | GAP | GAP | entity-specific, see capability model |
| `held` | GAP | GAP | GAP | entity-specific, see capability model |
| `agreed_pending` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. method=fixed_percentage requires percentage; fixed_amount requires amount_minor; index_linked requires index_key and index_lag_months; stepped_schedule requires steps; open_market_review requires requires_agreement true.
2. effective_dates may not be empty and every date falls within the lease term.
3. cap_percentage, where set, is at or above floor_percentage.
4. An index-linked escalation is never applied with an estimated or provisional index value. Where the value is unpublished the escalation is held and reported, because applying an estimate and correcting it later produces a charge, a credit and a conversation for every affected period.
5. An escalation that requires agreement never computes an amount automatically. It raises an obligation for somebody to negotiate and records the outcome.

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

- Permission matrix: `14-PERMISSIONS/lease_management/escalation_rule.md`
- Screen specifications: `11-UX/screens/lease_management/escalation_rule/`
- Test catalogue: `20-TESTING/lease_management/escalation_rule/`
