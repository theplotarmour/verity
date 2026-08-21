---
doc_id: ENT-REPORT_EXPORT
title: Entity — Export
generated: true
source_model: _model/capabilities/reporting.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Export

*This document is generated. Edit `_model/capabilities/reporting.yaml`, not this file.*

**Capability/module:** `reporting` · **Owner scope:** `tenant`

A copy of a report's figures or rows leaving the system, with who took it, why, and what was withheld.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `run_id` | uuid | yes | no | — | no | no |  |
| `requested_by_principal_id` | uuid | yes | no | — | no | no |  |
| `purpose` | text | yes | no | — | no | no | mandatory. An export with no stated purpose is one nobody can assess afterwards, and export is the platform's principal exfiltration route |
| `format` | enum | yes | no | — | no | no |  |
| `row_count` | int | yes | no | — | no | no |  |
| `withheld_field_keys` | json | no | no | — | no | no | which fields were removed by the reader's own gates, stated IN the exported file so a recipient knows the file is partial |
| `watermark` | string | yes | no | — | no | no | the exporting principal, the tenant and the timestamp, rendered into the file. A file that circulates without its provenance is one nobody can trace back |
| `requested_at` | timestamptz | yes | yes | — | no | no |  |
| `completed_at` | timestamptz | no | no | — | no | no |  |
| `download_count` | int | yes | no | — | no | no |  |
| `expires_at` | timestamptz | yes | no | — | no | no | the generated file expires. An export link that lives forever is a permanent copy of the data outside every control |

## 2. Lifecycle

States: `requested`, `generating`, `available`, `expired`, `failed`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `requested` | GAP | GAP | GAP | entity-specific, see capability model |
| `generating` | GAP | GAP | GAP | entity-specific, see capability model |
| `available` | GAP | GAP | GAP | entity-specific, see capability model |
| `expired` | GAP | GAP | GAP | entity-specific, see capability model |
| `failed` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. purpose is mandatory and non-empty.
2. An export is projected exactly as the run was. It is never a route around a field gate, and the fields withheld are named in the file so the recipient knows it is partial.
3. Every export writes an audit record of class always, per the vocabulary's treatment of export as an exfiltration vector.
4. The generated file expires and the link is single-tenant and non-guessable. Export links that persist are the most common way tenant data ends up permanently outside the platform.
5. An export inherits the small-population suppression of its run. Exporting is not a way to obtain the cells the interface suppressed.

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

- Permission matrix: `14-PERMISSIONS/reporting/report_export.md`
- Screen specifications: `11-UX/screens/reporting/report_export/`
- Test catalogue: `20-TESTING/reporting/report_export/`
