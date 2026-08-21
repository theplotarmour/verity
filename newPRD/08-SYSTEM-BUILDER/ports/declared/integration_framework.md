---
doc_id: PORTC-INTEGRATION_FRAMEWORK
title: Port contract — integration_framework
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — integration_framework

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

### `integrations`

**Cardinality:** `exactly_one`

Register an outbound subscription with a field-level redaction set, emit an event for delivery, expose an inbound endpoint mapped to a platform action, and report delivery and processing outcomes back to the subscribing capability. Reporting outcomes back is part of the contract, because the capability that produced an event is the only one that knows what a failed delivery costs.


## Consumers and their declared behaviour when unbound

No capability in the library requires this port.

## Generated provider conformance tests

**PC-01** A provider bound to `integration_framework` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `integration_framework` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `integration_framework` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

