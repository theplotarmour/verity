---
doc_id: ENT-TICKET_CATEGORY
title: Entity — Category
generated: true
source_model: _model/capabilities/helpdesk.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Category

*This document is generated. Edit `_model/capabilities/helpdesk.yaml`, not this file.*

**Capability/module:** `helpdesk` · **Owner scope:** `tenant`

What a ticket is about, carrying the default priority, the target queue, the response targets and the conversion behaviour.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `key` | string | yes | yes | tenant | no | no |  |
| `label` | string | yes | no | — | no | no |  |
| `parent_category_id` | uuid | no | no | — | no | no |  |
| `default_queue_id` | uuid | no | no | — | no | no |  |
| `default_priority` | enum | yes | no | — | no | no |  |
| `first_response_target_minutes` | int | no | no | — | no | no |  |
| `resolution_target_minutes` | int | no | no | — | no | no |  |
| `converts_to_work_type_ref` | uuid | no | no | — | no | no | what kind of work this category typically becomes, resolved through the work_generation port |
| `requires_subject` | bool | yes | no | — | no | no |  |
| `owner_principal_id` | uuid | no | no | — | no | no | who is accountable for the quality of outcomes in this category, which is who hears about a reopen chain |
| `reporter_selectable` | bool | yes | no | — | no | no | whether a reporter may choose it. Some categories are staff-only classifications and offering them to reporters produces mis-categorised tickets that route badly |

## 2. Lifecycle

States: `active`, `retired`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `active` | False | True | True | In normal operational use. |
| `retired` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. Category depth is bounded at category_max_depth and may not contain a cycle.
2. first_response_target_minutes and resolution_target_minutes are advisory here; where an sla_contract applies, the contract governs and the difference between the two is reported rather than silently resolved.
3. A category with converts_to_work_type_ref set requires the work_generation port to be bound before it can be selected, checked at configuration rather than at conversion.

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

- Permission matrix: `14-PERMISSIONS/helpdesk/ticket_category.md`
- Screen specifications: `11-UX/screens/helpdesk/ticket_category/`
- Test catalogue: `20-TESTING/helpdesk/ticket_category/`
