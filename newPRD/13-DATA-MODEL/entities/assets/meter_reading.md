---
doc_id: ENT-METER_READING
title: Entity — Meter Reading
generated: true
source_model: _model/capabilities/assets.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Meter Reading

*This document is generated. Edit `_model/capabilities/assets.yaml`, not this file.*

**Capability/module:** `assets` · **Owner scope:** `tenant`

One observation of a counter on an asset, with who read it, how, and whether it is plausible.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `asset_id` | uuid | yes | no | — | no | no |  |
| `meter_key` | string | yes | no | — | no | no |  |
| `value` | decimal | yes | no | — | no | no |  |
| `unit` | string | yes | no | — | no | no |  |
| `read_at` | timestamptz | yes | no | — | no | no |  |
| `recorded_at` | timestamptz | yes | no | — | no | no |  |
| `source` | enum | yes | no | — | no | no | estimated is first-class, because an estimated reading is what actually happens when nobody can get to the thing, and recording it as manual would make every downstream schedule look better evidenced than it is |
| `read_by_principal_id` | uuid | no | no | — | no | no |  |
| `evidence_ref` | string | no | no | — | no | no | a photograph of the counter, through the evidence_capture port. This is what settles a disputed reading |
| `delta_since_previous` | decimal | no | no | — | no | no | derived at write, so an implausible jump is detectable at the moment it is entered rather than at the next schedule run |
| `plausibility` | enum | yes | no | — | no | no |  |
| `superseded_by_reading_id` | uuid | no | no | — | no | no |  |

## 2. Lifecycle

States: `recorded`, `superseded`, `disregarded`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `recorded` | GAP | GAP | GAP | entity-specific, see capability model |
| `superseded` | GAP | GAP | GAP | entity-specific, see capability model |
| `disregarded` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. Readings are append-only. A wrong reading is superseded by a corrected one with a reason; it is never edited, because maintenance demand may already have been generated from it.
2. value is non-negative for a cumulative meter.
3. A reading lower than the previous one on a cumulative meter is recorded as went_backwards and is NOT rejected. Counters are replaced, roll over and are misread, and rejecting the reading means the true current value never gets in.
4. delta_since_previous is derived and frozen at write, against the reading in force at that moment. Recomputing it after a correction elsewhere would silently change history.
5. A reading whose read_at is earlier than an existing later reading is accepted and marked out-of-order, because a technician entering yesterday's reading today is ordinary.

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

- Permission matrix: `14-PERMISSIONS/assets/meter_reading.md`
- Screen specifications: `11-UX/screens/assets/meter_reading/`
- Test catalogue: `20-TESTING/assets/meter_reading/`
