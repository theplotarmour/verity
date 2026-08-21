---
doc_id: ENT-WORK_TYPE
title: Entity — Work Type
generated: true
source_model: _model/capabilities/work_order.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Work Type

*This document is generated. Edit `_model/capabilities/work_order.yaml`, not this file.*

**Capability/module:** `work_order` · **Owner scope:** `tenant`

The definition of a kind of work - its checklist template, its evidence requirements, who signs it off, and its default duration. The configuration surface that makes one work order capability behave differently per pack.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `key` | string | yes | yes | tenant | no | no |  |
| `label` | string | yes | no | — | no | no |  |
| `checklist_template_id` | uuid | no | no | — | no | no |  |
| `required_qualification_keys` | json | no | no | — | no | no | flat list of scalars, passed through to the demand this work type generates |
| `default_duration_minutes` | int | no | no | — | no | no |  |
| `presence_evidence_required` | enum | yes | no | — | no | no |  |
| `photo_evidence_min_count` | int | yes | no | — | no | no |  |
| `signoff_by` | enum | yes | no | — | no | no |  |
| `signature_required` | bool | yes | no | — | no | no |  |
| `allows_parts` | bool | yes | no | — | no | no |  |
| `default_billable` | enum | yes | no | — | no | no |  |
| `reopen_window_days` | int | yes | no | — | no | no |  |
| `hold_reasons` | json | yes | no | — | no | no | flat list of reason keys, each with whether it pauses a contractual clock. The pause decision is proposed here and ratified by the sla_contract capability, which owns the contract |
| `source_pack_key` | string | no | no | — | no | no |  |

## 2. Lifecycle

States: `draft`, `active`, `archived`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `active` | False | True | True | In normal operational use. |
| `archived` | True | False | False | Retained, excluded from default lists and from all aggregate reports unless explicitly included. |

## 3. Invariants

1. signature_required implies signoff_by is not none. A signature with nobody nominated to give it is a field that will stay empty.
2. photo_evidence_min_count above zero requires the evidence_capture port to be bound, checked at publication rather than at completion, so the failure surfaces to the person configuring it rather than to somebody standing at a location.
3. hold_reasons may not be empty. A hold with no reason is a work order that stopped for reasons nobody recorded, and it is the most common way an SLA argument becomes unwinnable.
4. Editing a work_type never changes a work order already created from it. The order captures the resolved requirements at submission, because otherwise tightening a requirement retroactively invalidates completed work.

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

- Permission matrix: `14-PERMISSIONS/work_order/work_type.md`
- Screen specifications: `11-UX/screens/work_order/work_type/`
- Test catalogue: `20-TESTING/work_order/work_type/`
