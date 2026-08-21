---
doc_id: COMP-000
title: The Verity Composition Model
generated: true
source_model: _model/_composition.yaml
regenerate_with: python3 _tools/generate.py
---

# The Verity Composition Model

*Generated. Edit `_model/_composition.yaml`, not this file.*

The kernel (_kernel.yaml) says what Verity is made of. This file says how those pieces combine into materially different business operating systems without branching on industry anywhere in the code.
Test of success, restated from the mandate: a blank tenant plus Pack A must present as a different product from the same blank tenant plus Pack B, with no code difference between them.


## Composition stack

| Layer | Name | Supplies | Overridable by |
|---|---|---|---|
| 1 | **Kernel** | constructs, reserved states, error taxonomy, permission evaluation order, audit classes, expression language | False |
| 2 | **Capability Library** | entities, fields, lifecycles, actions, events, ports, default rules, default views | ['pack', 'tenant'] |
| 3 | **Pack** | capability selection, port bindings, role definitions, navigation, default configuration, default workflows, seeded reference data | ['tenant'] |
| 4 | **System Template** | a named, tested starting point that is a pack set plus opinionated configuration, e.g. "Security Agency — Delhi NCR" | ['tenant'] |
| 5 | **Tenant Configuration** | configuration values, role tuning, navigation tuning, rule overrides within overridable_at limits, branding | ['site', 'role', 'user'] |
| 6 | **Site / Role / User Configuration** | the narrowest overrides — a site with a different SLA, a role with a shorter session, a user with different notification preferences | terminal |

Resolution is strictly layered. Each layer may only narrow or override the layer above it, never contradict a kernel rule. The resolved output is a TENANT MANIFEST — a fully explicit, versioned, diffable document describing exactly what this tenant is. Nothing at runtime is implicit.


## Anti-ERP tests

These are falsifiable and mostly automatable. They are the objective answer to *is this still a composable platform or has it become an ERP*.

| ID | Test | Pass condition | Automatable |
|---|---|---|---|
| AET-01 | grep the capability library for industry nouns (restaurant, clinic, guard, salon, factory, vehicle, patient, diner, table). | zero occurrences outside pack definitions, terminology maps and test fixtures. | True |
| AET-02 | grep for conditional branching on tenant identity, pack identity or industry. | zero occurrences in capability logic. | True |
| AET-03 | every cross-capability reference resolves to a Port, not a concrete entity. | zero direct cross-capability foreign keys. | True |
| AET-04 | instantiate service_operations and food_service from the same blank tenant; diff the resulting navigation, roles, entities and workflows. | the diff shows two materially different products with an identical binary. | partially |
| AET-05 | disable a capability that another capability declares a requires-port against. | the consumer degrades per its declared unbound_behaviour, with no error and no orphaned UI affordance. | True |
| AET-06 | count decisions a tenant MUST answer before the system is usable. | under a threshold to be set from operator interviews. High counts are how onboarding becomes a consulting engagement, which is the dominant complaint pattern in the platforms researched. | True |
