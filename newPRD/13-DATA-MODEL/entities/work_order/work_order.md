---
doc_id: ENT-WORK_ORDER
title: Entity — Work Order
generated: true
source_model: _model/capabilities/work_order.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Work Order

*This document is generated. Edit `_model/capabilities/work_order.yaml`, not this file.*

**Capability/module:** `work_order` · **Owner scope:** `tenant`

One committed unit of work with a subject, a window, an assignee, an outcome and its evidence.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `reference` | string | yes | yes | tenant | no | no | the human-facing number people say out loud. A separate display field, never the primary key, per kernel K03 |
| `title` | string | yes | no | — | no | no |  |
| `description` | text | no | no | — | no | no |  |
| `subject_ref` | uuid | no | no | — | no | no | what is being worked on, resolved through the work_subject port. Opaque here. Deliberately not a foreign key |
| `subject_capability_key` | string | no | no | — | no | no | which capability owns the subject, so an orphan is traceable |
| `location_ref` | uuid | no | no | — | no | no | resolved through the org_structure port |
| `requesting_party_ref` | uuid | no | no | — | no | no | resolved through the party_directory port |
| `origin` | enum | yes | no | — | no | no |  |
| `origin_ref` | uuid | no | no | — | no | no | the ticket, plan or prior order that produced this one, resolved through the relevant port |
| `work_type_id` | uuid | yes | no | — | no | no |  |
| `priority` | enum | yes | no | — | no | no |  |
| `requested_for_at` | timestamptz | no | no | — | no | no |  |
| `due_at` | timestamptz | no | no | — | no | no | derived from the sla_clock port where bound, otherwise set manually. Which of the two it was is recorded, because a manually set due date and a contractual one carry different consequences |
| `due_source` | enum | yes | no | — | no | no |  |
| `assigned_resource_ref` | uuid | no | no | — | no | no | resolved through the schedulable_resource port |
| `started_at` | timestamptz | no | no | — | no | no |  |
| `completed_at` | timestamptz | no | no | — | no | no |  |
| `outcome` | enum | no | no | — | no | no | deliberately includes the honest outcomes. A system that only offers "done" gets "done" for everything, including the visits where nothing could be fixed |
| `outcome_notes` | text | no | no | — | no | no |  |
| `signed_off_by` | enum | no | no | — | no | no |  |
| `signed_off_at` | timestamptz | no | no | — | no | no |  |
| `signature_evidence_ref` | string | no | no | — | no | no |  |
| `reopen_of_work_order_id` | uuid | no | no | — | no | no |  |
| `reopen_count` | int | yes | no | — | no | no | on the original, incremented by each reopen. A rising reopen rate for a work_type is the single most useful quality signal this capability produces |
| `labour_minutes` | int | no | no | — | no | no |  |
| `travel_minutes` | int | no | no | — | no | no |  |
| `cost_estimate_minor` | money_minor | no | no | — | no | yes |  |
| `cost_actual_minor` | money_minor | no | no | — | no | yes |  |
| `billable` | enum | yes | no | — | no | yes | a classification this capability records and does not decide. The rule that sets it is tenant policy and the money is the billing capability's |

## 2. Lifecycle

States: `draft`, `ready`, `scheduled`, `in_progress`, `on_hold`, `awaiting_signoff`, `completed`, `cancelled`, `reopened`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `ready` | GAP | GAP | GAP | entity-specific, see capability model |
| `scheduled` | GAP | GAP | GAP | entity-specific, see capability model |
| `in_progress` | GAP | GAP | GAP | entity-specific, see capability model |
| `on_hold` | GAP | GAP | GAP | entity-specific, see capability model |
| `awaiting_signoff` | GAP | GAP | GAP | entity-specific, see capability model |
| `completed` | GAP | GAP | GAP | entity-specific, see capability model |
| `cancelled` | GAP | GAP | GAP | entity-specific, see capability model |
| `reopened` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. completed_at requires outcome to be set and not not_recorded. A completion with no outcome is a record that says only that somebody pressed a button.
2. started_at, where set, is on or before completed_at.
3. A work order may not be completed while any checklist item marked blocking is unanswered, and may not be completed while any evidence requirement of its work_type is unmet, unless an override is recorded with a reason.
4. reopen_of_work_order_id and origin=reopen are set together or not at all.
5. Financial fields are gated by view_financial and are never offline_editable, per the kernel rule. This matters especially here, because the field surface is the one most likely to be used offline.
6. subject_ref is opaque. No query in this capability may join to a subject's own attributes; anything it needs comes through the work_subject port.

## 4. Deletion and retention semantics

| Question | Answer |
|---|---|
| Soft or hard delete | Soft by default (`deleted` reserved state). Hard delete only via retention job or a data-subject erasure request. |
| What happens to children | Blocked if any child row in a non-terminal state references this row. The user is shown the blocking rows, not a generic error. |
| What happens to audit rows | Retained. Audit rows are never cascade-deleted. |
| What happens to emitted events | Retained. Events are immutable history. |
| Archive vs delete | Archive removes from default lists and aggregate reports; delete removes from all reads except audit and legal hold. |

## 5. Tenant isolation

Tenancy mode: `tenant_scoped_with_site_partition`. Enforced by Postgres row-level security on `tenant_id`, not by application `WHERE` clauses. Every query runs under a role that cannot see other tenants even if the application layer forgets a predicate. Cross-tenant reads require a platform archetype and are audited under `security`.

## 6. Related documents

- Permission matrix: `14-PERMISSIONS/work_order/work_order.md`
- Screen specifications: `11-UX/screens/work_order/work_order/`
- Test catalogue: `20-TESTING/work_order/work_order/`
