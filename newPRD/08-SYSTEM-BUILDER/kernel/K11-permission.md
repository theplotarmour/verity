---
doc_id: KERNEL-K11
title: Kernel construct K11 — Permission
generated: true
source_model: _model/_kernel.yaml
regenerate_with: python3 _tools/generate.py
---

# Kernel construct K11 — Permission

*Generated. Edit `_model/_kernel.yaml`, not this file.*

**Definition.** A grant of (verb x entity x field-set x scope) to a role, evaluated in that order.

## Required attributes

- **name**: verb
- **name**: entity
- **name**: field_set; **note**: all | all_except_gated | explicit list
- **name**: scope; **ref**: vocabulary.scopes
- **name**: conditions; **note**: optional rule expression for conditional grants

## Invariants

- Denial at scope returns 404, never 403. Confirming that a record exists outside your scope is itself a leak.
- Field denial removes the key from the payload. It must not appear as null.
- Permissions are additive across roles (a principal holding two roles gets the union), with explicit DENY entries evaluated last and winning. This mirrors the additive permission-set model rather than profile cloning, which is what makes role explosion avoidable.

## Evaluation order

- authenticate
- entity_check
- action_check
- scope_check
- field_projection
- rule_conditions

