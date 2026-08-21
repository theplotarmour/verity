---
doc_id: KERNEL-K13
title: Kernel construct K13 — Port
generated: true
source_model: _model/_kernel.yaml
regenerate_with: python3 _tools/generate.py
---

# Kernel construct K13 — Port

*Generated. Edit `_model/_kernel.yaml`, not this file.*

**Definition.** A named, typed extension point through which one capability consumes another WITHOUT knowing which capability satisfies it.

## Why this construct exists

THIS IS THE CONSTRUCT THAT MAKES VERITY NOT AN ERP. Work Order declares a port "billable_outcome_sink". In a security-agency tenant that port is bound to Attendance-based billing. In an AMC tenant it is bound to Contract billing. In a tenant with no billing module it is bound to null and the work order simply completes. The Work Order capability contains no branch on industry.


## Required attributes

- **name**: port_key
- **name**: direction; **values**: ['requires', 'provides']
- **name**: contract; **note**: the entity shape, actions and events a provider must satisfy
- **name**: cardinality; **values**: ['zero_or_one', 'exactly_one', 'zero_or_many']
- **name**: unbound_behaviour; **note**: MANDATORY. What the consuming capability does when nothing is bound. "Error" is rarely the right answer.
- **name**: bound_by; **values**: ['pack', 'tenant_config', 'system_template']

## Invariants

- Every requires-port must declare unbound_behaviour. A capability that cannot function with a port unbound is not composable and must be redesigned or merged with its dependency.
- A provides-port declares a contract that the provider is tested against. Contract tests are generated, not written by hand.

## Generated artifacts

- port_contract_doc
- provider_conformance_tests
- composition_graph_node

