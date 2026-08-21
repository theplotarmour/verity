---
doc_id: KERNEL-K04
title: Kernel construct K04 — Relationship
generated: true
source_model: _model/_kernel.yaml
regenerate_with: python3 _tools/generate.py
---

# Kernel construct K04 — Relationship

*Generated. Edit `_model/_kernel.yaml`, not this file.*

**Definition.** A declared, directional, cardinality-bearing link between two Entities, including across capability boundaries.

## Why this construct exists

This is the construct that makes composition real. Work Order does not know that Assets exists. It declares that it MAY reference a subject of kind "asset-like" and the composition layer binds that to the Assets capability only if the tenant has Assets enabled.


## Required attributes

- **name**: from_entity; **ref**: K03
- **name**: to_entity_or_port; **note**: a concrete entity, or a Port (K13) when the target is resolved at composition time
- **name**: cardinality; **values**: ['one_to_one', 'one_to_many', 'many_to_one', 'many_to_many']
- **name**: optionality; **values**: ['required', 'optional', 'conditional']
- **name**: on_target_archive; **values**: ['block', 'allow_and_freeze', 'allow_and_null']
- **name**: on_target_delete; **values**: ['block', 'cascade_soft', 'null_out']
- **name**: traversal_permission; **note**: may a principal who can see the source see the target? Never assumed yes.
- **name**: denormalisation; **note**: which target fields are copied onto the source for list performance, and the staleness policy for each

## Invariants

- Every cross-capability relationship must target a Port, never a concrete entity. A concrete cross-capability target is a hard generator error.
- traversal_permission must be declared. Inheriting visibility down a relationship is the single most common source of accidental data exposure and is never implicit in Verity.

