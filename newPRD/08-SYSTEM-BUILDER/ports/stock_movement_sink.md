---
doc_id: PORT-STOCK_MOVEMENT_SINK
title: Port contract — stock_movement_sink
generated: true
source_model: _model/_composition.yaml
regenerate_with: python3 _tools/generate.py
---

# Port contract — stock_movement_sink

*Generated. Edit `_model/_composition.yaml`, not this file.*

**Direction:** `requires` · **Cardinality:** `zero_or_one`

**Contract.** consume, reserve, return or scrap a quantity of an item at a location

**Declared by.** `work_order`, `manufacturing`, `delivery`

**Behaviour when unbound.** Parts used are recorded as free text on the work order for billing evidence, with no stock effect.

## Generated provider conformance tests

**PC-01** A provider bound to `stock_movement_sink` satisfies every element of the contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `stock_movement_sink` unbound, every declaring capability behaves exactly as stated under *Behaviour when unbound*, with no orphaned UI affordance and no error surfaced to the user.

**PC-03** Rebinding `stock_movement_sink` from provider A to provider B leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

