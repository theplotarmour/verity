---
doc_id: KERNEL-K07
title: Kernel construct K07 — Rule
generated: true
source_model: _model/_kernel.yaml
regenerate_with: python3 _tools/generate.py
---

# Kernel construct K07 — Rule

*Generated. Edit `_model/_kernel.yaml`, not this file.*

**Definition.** A declarative constraint or derivation evaluated by the platform rather than coded per capability.

## Why this construct exists

This is where tenant difference lives. The product owner's directive is explicit: where businesses legitimately differ, model the difference as configuration or workflow policy, never as a hardcoded assumption. A Rule is the artifact that difference is expressed in.


## Required attributes

- **name**: scope; **values**: ['kernel', 'capability', 'pack', 'tenant', 'site']
- **name**: overridable_at; **note**: the lowest scope permitted to override this rule
- **name**: expression_language; **note**: see K16
- **name**: evaluation_order
- **name**: on_conflict; **note**: what happens when two rules at the same scope disagree

## Invariants

- A rule marked scope=kernel may never be overridden. Tenant isolation, audit immutability and financial-action-offline-refusal are kernel rules.
- Every overridable rule must ship a default. A rule with no default forces every tenant to answer a question at provisioning time, which is how onboarding becomes a consulting project — the exact failure mode Odoo implementations are criticised for.

## Kinds

- **kind**: validation; **when**: before_write; **effect**: reject with E_VALIDATION
- **kind**: guard; **when**: before_transition; **effect**: reject with E_PRECONDITION
- **kind**: derivation; **when**: on_write; **effect**: compute a field value
- **kind**: policy; **when**: on_evaluation; **effect**: yield a configurable decision, e.g. is this backfill billable
- **kind**: constraint; **when**: continuous; **effect**: an invariant the system monitors, e.g. no site left unstaffed

