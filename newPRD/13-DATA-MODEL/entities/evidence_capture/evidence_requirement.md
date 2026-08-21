---
doc_id: ENT-EVIDENCE_REQUIREMENT
title: Entity — Evidence Requirement
generated: true
source_model: _model/capabilities/evidence_capture.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Evidence Requirement

*This document is generated. Edit `_model/capabilities/evidence_capture.yaml`, not this file.*

**Capability/module:** `evidence_capture` · **Owner scope:** `tenant`

A declaration by a consuming capability that a particular act needs particular evidence, with what counts as satisfying it.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `requirement_key` | string | yes | yes | tenant | no | no |  |
| `declaring_capability_key` | string | yes | no | — | no | no |  |
| `label` | string | yes | no | — | no | no |  |
| `kind` | enum | yes | no | — | no | no |  |
| `min_count` | int | yes | no | — | no | no |  |
| `max_count` | int | no | no | — | no | no |  |
| `requires_live_capture` | bool | yes | no | — | no | no | whether a gallery selection is acceptable. Set true where it matters and honoured only on devices that can report it, which is stated rather than assumed |
| `requires_position` | bool | yes | no | — | no | no |  |
| `min_position_accuracy_m` | int | no | no | — | no | no |  |
| `prompt_text` | text | yes | no | — | no | no | what the person is asked to capture. Mandatory, because an unlabelled camera button produces photographs of the floor |
| `retention_class` | string | yes | no | — | no | no |  |
| `retention_months` | int | no | no | — | no | no |  |
| `subject_visible` | bool | yes | no | — | no | no | whether the person the evidence is about may see it |
| `sensitive` | bool | yes | no | — | no | no | gated by view_sensitive when true, which is the correct setting for anything showing a person or an identity document |
| `source_pack_key` | string | no | no | — | no | no |  |

## 2. Lifecycle

States: `draft`, `active`, `retired`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `active` | False | True | True | In normal operational use. |
| `retired` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. min_count is at least one and max_count, where set, is at least min_count.
2. prompt_text is mandatory and non-empty. An unlabelled capture control produces evidence of nothing.
3. requires_live_capture true is honoured only where the device reports capture provenance, and where it cannot, the item records from_live_capture as null and the requirement is marked as satisfied-without-provenance rather than as satisfied.
4. retention_months is mandatory unless the retention_class is one whose lifetime is set by a policy elsewhere. Evidence with no stated lifetime is evidence that is kept forever by accident.
5. Changing a requirement never invalidates evidence already captured against it. A stricter requirement applies from its change forward and existing records are listed rather than failed.

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

- Permission matrix: `14-PERMISSIONS/evidence_capture/evidence_requirement.md`
- Screen specifications: `11-UX/screens/evidence_capture/evidence_requirement/`
- Test catalogue: `20-TESTING/evidence_capture/evidence_requirement/`
