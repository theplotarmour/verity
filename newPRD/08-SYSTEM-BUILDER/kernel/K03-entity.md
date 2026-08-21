---
doc_id: KERNEL-K03
title: Kernel construct K03 — Entity
generated: true
source_model: _model/_kernel.yaml
regenerate_with: python3 _tools/generate.py
---

# Kernel construct K03 — Entity

*Generated. Edit `_model/_kernel.yaml`, not this file.*

**Definition.** A named business concept with identity, a field set, a lifecycle, an owner and a tenancy mode.

## Required attributes

- **name**: fields; **ref**: K02
- **name**: tenancy_mode; **values**: ['tenant_scoped', 'platform_scoped', 'cross_tenant_with_membership', 'tenant_scoped_with_site_partition']
- **name**: lifecycle; **ref**: K05
- **name**: identity_strategy; **values**: ['uuid_v7', 'tenant_scoped_sequence', 'natural_key']; **note**: human-facing numbers (WO-2026-00123) are a separate display field, never the primary key
- **name**: soft_delete
- **name**: retention_policy
- **name**: search_projection; **note**: which fields enter the platform search index, and under which permission gate
- **name**: offline_availability; **values**: ['never', 'on_demand', 'prefetch_by_assignment', 'prefetch_by_site']

## Invariants

- Every tenant_scoped entity carries tenant_id and is protected by row-level security at the database role level, not by application predicates.
- No entity may be referenced across a capability boundary except through a declared Relationship (K04). Direct foreign keys across capabilities are a generator error — this is what stops the library collapsing into a monolith.

## Generated artifacts

- entity_doc
- ddl_table
- ddl_rls_policy
- api_resource
- permission_matrix
- screen_set
- test_suite
- search_index_spec

