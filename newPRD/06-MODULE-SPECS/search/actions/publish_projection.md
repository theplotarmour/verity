---
doc_id: ACT-SEARCH-PUBLISH_PROJECTION
title: Action — Change what is searchable
generated: true
source_model: _model/capabilities/search.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Change what is searchable

*This document is generated. Edit `_model/capabilities/search.yaml`, not this file.*

**Entity:** `search_projection` · **Capability:** `search`

## 1. Specification

### Who can perform it

- platform_operator
- tenant_admin

### Preconditions

- every field declares a gate verb
- every scope field is present
- the owning capability is enabled

### Inputs

- capability_key
- entity_key
- field_projections
- display_fields
- scope_fields
- freshness_target_seconds

### What is created

- search_projection
- a reindex job

### What is modified

- previous version marked for supersession

### What events fire

- search.projection_published

### Who is notified

- **to**: platform_operator; **channel**: in_app; **when**: the reindex is expected to exceed the long-reindex threshold; **template**: long_reindex_scheduled; **must_include**: ['entity', 'estimated_duration']

### Can it be undone

Yes.

### Concurrency behaviour

The previous version continues serving queries until the new one completes its backfill, so search never goes dark during a reindex. Two concurrent publications for one entity serialise, and the later supersedes the earlier without either being partially applied.


### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | a field projection has no gate_verb | Every searchable field needs a permission gate. | False | the single most important validation here. A field with no gate is a field somebody indexed by accident and it will be returned to somebody who should not see it |
| `E_VALIDATION` | 422 | a sensitive or financial field is projected into display_fields without a gate | field-specific | False |  |
| `E_PRECONDITION` | 409 | a scope field the entity is protected by is absent from scope_fields | This action is not available in the current state. | False | names the missing scope. Publishing anyway would produce an index that cannot be filtered on it, forcing every query into a full re-check |
| `E_QUOTA` | 402 | the projection would exceed the tenant index size limit | Plan limit reached. | False |  |
| `E_PRECONDITION` | 409 | the owning capability is disabled | This action is not available in the current state. | False |  |

## 3. Edge cases

**EC-01.** Publishing a projection that adds a gated field. The reindex rebuilds with the gate applied, and until it completes the field is unsearchable rather than searchable without its gate. Ungated-then-gated is the wrong order and would create a window in which the field is exposed.

**EC-02.** Removing a field from a projection. The reindex removes it and any saved search referencing it becomes broken and is reported. Silently dropping it from those searches would change what they mean without telling anybody.

**EC-03.** A reindex that takes hours on a large tenant. The previous version serves throughout, and the newly projected fields are unsearchable until it completes. This is invisible to users, which is exactly why the stall monitor reports to operators.

**EC-04.** Publishing a projection for an entity in a capability that is later disabled. The projection remains and its index is not served, so re-enabling the capability restores search without a rebuild. Deleting it on disable would make re-enablement expensive for no benefit.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/search/search_projection/publish_projection.md`.
