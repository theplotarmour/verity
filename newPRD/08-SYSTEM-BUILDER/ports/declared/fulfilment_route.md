---
doc_id: PORTC-FULFILMENT_ROUTE
title: Port contract — fulfilment_route
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — fulfilment_route

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

### `kitchen_flow`

**Cardinality:** `zero_or_many`

Accept lines for preparation with their routing tags, notes, quantities and a coordination target; report start, readiness, collection and recall; accept a cancellation request and refuse it where the work is already done. The source request is opaque throughout.


## Consumers and their declared behaviour when unbound

### `order`

**Cardinality:** `zero_or_many`

Accept a line for fulfilment, report start, progress and completion, and accept a cancellation request which it may refuse. The route is opaque - this capability never learns what kind of fulfilment it is.


**When unbound.** Lines are never routed and are marked fulfilled manually by whoever did the work. Everything commercial still functions. What is lost is any independent evidence that the thing was done, so a fulfilled line becomes an assertion by the person recording it, and the order surface says so rather than showing the same tick as a routed fulfilment.


## Generated provider conformance tests

**PC-01** A provider bound to `fulfilment_route` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `fulfilment_route` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `fulfilment_route` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

