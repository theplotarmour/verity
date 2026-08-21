---
doc_id: KERNEL-K01
title: Kernel construct K01 — FieldType
generated: true
source_model: _model/_kernel.yaml
regenerate_with: python3 _tools/generate.py
---

# Kernel construct K01 — FieldType

*Generated. Edit `_model/_kernel.yaml`, not this file.*

**Definition.** A primitive value domain with defined storage, validation, rendering and comparison semantics.

## Why this construct exists

If fields carry arbitrary types, the generator cannot emit DDL, validation, API schema or UI controls. A closed FieldType set is what makes the whole generation pipeline possible.


## Required attributes

- **name**: storage_sql; **note**: Postgres column type
- **name**: storage_json; **note**: representation in API payloads and in the offline store
- **name**: validation_rules; **note**: intrinsic rules, e.g. e164 shape for phone
- **name**: default_ui_control
- **name**: comparable; **note**: can it be used in ORDER BY
- **name**: filterable_operators
- **name**: indexable
- **name**: pii_default; **note**: does an instance default to sensitive
- **name**: offline_safe; **note**: can it be edited offline without a merge hazard

## Invariants

- Every FieldType must define behaviour for null, empty and unknown separately. "Empty" and "not permitted to see" must never collapse into the same wire representation, because that leaks permission state.

## Extension rule

A new FieldType is a kernel change, not a tenant change. Tenants and packs may never introduce one. This is deliberate: ServiceNow's field-type set is similarly fixed and its field population concentrates in a handful of types (string and reference dominate), which is evidence that a small closed set is sufficient for real enterprise workloads.


