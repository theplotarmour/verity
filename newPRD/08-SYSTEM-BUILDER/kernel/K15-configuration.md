---
doc_id: KERNEL-K15
title: Kernel construct K15 — Configuration
generated: true
source_model: _model/_kernel.yaml
regenerate_with: python3 _tools/generate.py
---

# Kernel construct K15 — Configuration

*Generated. Edit `_model/_kernel.yaml`, not this file.*

**Definition.** A typed, scoped, defaulted, validated setting that alters behaviour without altering the model.

## Required attributes

- **name**: config_key
- **name**: value_type; **ref**: K01
- **name**: lowest_settable_scope
- **name**: default
- **name**: validation
- **name**: change_impact; **values**: ['immediate', 'next_session', 'requires_migration', 'requires_staging']
- **name**: audit_on_change; **default**: True

## Invariants

- Precedence is strictly most-specific-wins with no partial merging of scalar values. Object-valued configuration is forbidden precisely because merge semantics become ambiguous.
- Any configuration with change_impact=requires_migration or requires_staging may not be changed by a tenant admin in production directly; it routes through the staging-first path.

## Scopes, in precedence order

- kernel_default
- capability_default
- pack_default
- tenant
- site
- role
- user

