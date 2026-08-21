---
doc_id: PORT-SCHEDULABLE_DEMAND
title: Port contract — schedulable_demand
generated: true
source_model: _model/_composition.yaml
regenerate_with: python3 _tools/generate.py
---

# Port contract — schedulable_demand

*Generated. Edit `_model/_composition.yaml`, not this file.*

**Direction:** `provides` · **Cardinality:** `zero_or_one`

**Contract.** a unit of demand with a time window, a required qualification set, a location and a priority

**Declared by.** `booking`, `work_order`, `shift_requirement`, `production_order`

**Behaviour when unbound.** GAP

## Generated provider conformance tests

**PC-01** A provider bound to `schedulable_demand` satisfies every element of the contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `schedulable_demand` unbound, every declaring capability behaves exactly as stated under *Behaviour when unbound*, with no orphaned UI affordance and no error surfaced to the user.

**PC-03** Rebinding `schedulable_demand` from provider A to provider B leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

