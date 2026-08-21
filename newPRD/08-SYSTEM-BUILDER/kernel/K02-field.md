---
doc_id: KERNEL-K02
title: Kernel construct K02 — Field
generated: true
source_model: _model/_kernel.yaml
regenerate_with: python3 _tools/generate.py
---

# Kernel construct K02 — Field

*Generated. Edit `_model/_kernel.yaml`, not this file.*

**Definition.** One named, typed attribute of one Entity, carrying its own security, validation and lifecycle metadata.

## Required attributes

- **name**: field_type; **ref**: K01
- **name**: required
- **name**: immutable_after; **note**: null | create | state:<state_key> — e.g. an invoice number is immutable after issue
- **name**: unique_scope; **note**: null | tenant | site | global
- **name**: sensitive; **note**: gated by view_sensitive
- **name**: financial; **note**: gated by view_financial
- **name**: default_value_source; **note**: literal | computed | inherited_from_parent | tenant_config | null
- **name**: validation_rules
- **name**: offline_editable
- **name**: merge_strategy; **note**: lww | server_wins | client_wins | manual | additive — used by offline reconciliation
- **name**: audit_on_change
- **name**: retention_class

## Invariants

- A field marked financial or sensitive is never offline_editable without an explicit kernel exemption, because offline devices are the weakest link in the security model.
- merge_strategy is mandatory for every offline_editable field. There is no default. A missing merge_strategy is a hard generator error, not a warning, because silent LWW on a quantity field silently destroys stock.

## Generated artifacts

- ddl_column
- api_property
- validation_rule
- ui_control
- test_cases
- audit_mapping

