---
doc_id: ENT-ESCALATION_POLICY
title: Entity — Escalation Policy
generated: true
source_model: _model/capabilities/backfill_dispatch.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Escalation Policy

*This document is generated. Edit `_model/capabilities/backfill_dispatch.yaml`, not this file.*

**Capability/module:** `backfill_dispatch` · **Owner scope:** `tenant`

The configured ladder - who is asked, in what order, with how long at each step and what premium, before the next step widens.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `key` | string | yes | yes | tenant | no | no |  |
| `label` | string | yes | no | — | no | no |  |
| `applies_to_priority` | json | yes | no | — | no | no | flat list of priority values this policy serves |
| `tiers` | json | yes | no | — | no | no | ordered list of tiers, each a flat set of scalars - audience_selector, time_budget_seconds, offer_expiry_minutes, concurrent_offer_count, premium_percent, notify_role. Flat rather than nested so a policy diff is readable and so no merge semantics are needed |
| `min_lead_minutes_for_full_ladder` | int | yes | no | — | no | no | below this the ladder compresses - tiers run concurrently rather than in sequence, because a sequential ladder with four tiers cannot complete inside twenty minutes of lead time |
| `allow_premium` | bool | yes | no | — | no | yes |  |
| `max_premium_percent` | int | no | no | — | no | yes |  |
| `source_pack_key` | string | no | no | — | no | no |  |

## 2. Lifecycle

States: `draft`, `active`, `archived`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `active` | False | True | True | In normal operational use. |
| `archived` | True | False | False | Retained, excluded from default lists and from all aggregate reports unless explicitly included. |

## 3. Invariants

1. tiers may not be empty and each tier's time_budget_seconds must be positive. A tier with no budget never expires and the ladder stops there.
2. The sum of tier budgets is compared against typical lead time at publication, and a policy whose ladder cannot complete within min_lead_minutes_for_full_ladder is refused unless compression is enabled. A ladder that cannot finish in time is a ladder that fails silently.
3. allow_premium false requires max_premium_percent null and every tier's premium_percent zero.
4. Editing a policy never alters a request already in flight. The request captures its resolved tiers at creation, because a ladder changing underneath a running escalation produces behaviour nobody can reconstruct afterwards.

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

- Permission matrix: `14-PERMISSIONS/backfill_dispatch/escalation_policy.md`
- Screen specifications: `11-UX/screens/backfill_dispatch/escalation_policy/`
- Test catalogue: `20-TESTING/backfill_dispatch/escalation_policy/`
