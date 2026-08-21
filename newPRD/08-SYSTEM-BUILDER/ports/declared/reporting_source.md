---
doc_id: PORTC-REPORTING_SOURCE
title: Port contract — reporting_source
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — reporting_source

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

> **GAP [modelling] — no capability in the library declares that it provides this port; it is either satisfied by a system outside Verity, or its provider has not been modelled. See _composition.yaml external_provider_ports and ports_awaiting_a_capability.**  
> Location: `port.reporting_source.provider` · Capability: `reporting_source`  
> **Blocks:** `capability:reporting`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.

## Consumers and their declared behaviour when unbound

### `reporting`

**Cardinality:** `zero_or_many`

Expose an entity or event stream for aggregation with its scope fields denormalised, its field gates declared, and its exclusion markers visible. Every capability that wants to be reportable declares this rather than reporting reaching into its tables.


**When unbound.** Nothing is reportable. Reports exist, resolve no metrics, and say so. Deliberately not an error, because a tenant may install reporting ahead of the capabilities that will feed it, and a capability may deliberately decline to be reportable.


## Generated provider conformance tests

**PC-01** A provider bound to `reporting_source` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `reporting_source` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `reporting_source` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

