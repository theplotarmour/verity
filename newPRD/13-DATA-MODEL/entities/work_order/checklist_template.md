---
doc_id: ENT-CHECKLIST_TEMPLATE
title: Entity — Checklist Template
generated: true
source_model: _model/capabilities/work_order.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Checklist Template

*This document is generated. Edit `_model/capabilities/work_order.yaml`, not this file.*

**Capability/module:** `work_order` · **Owner scope:** `tenant`

A versioned, ordered set of questions attached to a work type. Its answers are evidence, so it is versioned rather than edited.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `key` | string | yes | yes | — | no | no |  |
| `version_number` | int | yes | no | — | no | no |  |
| `items` | json | yes | no | — | no | no | ordered list of items, each a flat set of scalars - key, prompt, answer_kind, blocking, evidence_required, expected_value. Flat rather than nested, per the object-valued prohibition, so a template diff is readable |
| `published_at` | timestamptz | no | no | — | no | no |  |
| `published_by_principal_id` | uuid | no | no | — | no | no |  |

## 2. Lifecycle

States: `draft`, `published`, `superseded`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `published` | GAP | GAP | GAP | entity-specific, see capability model |
| `superseded` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. A published template is immutable. A change is a new version. A completed work order references the version it answered, so a later template edit can never alter what was recorded.
2. Item keys are unique and stable within a template lineage. Reusing a key for a different question across versions makes every historical answer wrong in a way nobody detects.
3. An item marked blocking must have an answer_kind that can be objectively unanswered. A free-text blocking item is satisfied by a space character.

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

- Permission matrix: `14-PERMISSIONS/work_order/checklist_template.md`
- Screen specifications: `11-UX/screens/work_order/checklist_template/`
- Test catalogue: `20-TESTING/work_order/checklist_template/`
