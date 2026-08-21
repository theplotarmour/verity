---
doc_id: PORTC-STOCK_AVAILABILITY
title: Port contract — stock_availability
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — stock_availability

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

### `inventory`

**Cardinality:** `exactly_one`

Report on-hand, reserved and available quantities for an item at a location or across a subtree, with the age of the last count as a confidence indicator.

## Consumers and their declared behaviour when unbound

### `catalog`

**Cardinality:** `zero_or_one`

Report whether the components of a composition are available in sufficient quantity at a location, so that a composite item's availability can be derived.

**When unbound.** Composite availability is derived only from the states of the component items, not from quantities. An item whose components exist but are exhausted still appears available. This is the single most visible degradation in this capability and the surface states it wherever composite availability is shown.


## Generated provider conformance tests

**PC-01** A provider bound to `stock_availability` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `stock_availability` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `stock_availability` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

