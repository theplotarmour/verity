---
doc_id: PORTC-CONFIG_RESOLUTION
title: Port contract — config_resolution
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — config_resolution

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

### `core_configuration`

**Cardinality:** `exactly_one`

Given a config_key and a full principal context - tenant, site, role set, user - return the resolved value, the scope it was resolved at, who set it and when. The provenance is part of the contract, not an extra. A resolver that returns only the value cannot answer the question every support call starts with.


## Consumers and their declared behaviour when unbound

### `hq_console`

**Cardinality:** `exactly_one`

Resolve and apply configuration deltas as part of manifest generation and deployment.

**When unbound.** FORBIDDEN. A manifest without resolved configuration describes nothing about how a tenant actually behaves.

### `notification`

**Cardinality:** `exactly_one`

Resolve quiet hours, batching windows, cost ceilings and channel preference order at tenant, site, role and user scope.

**When unbound.** FORBIDDEN. Every behavioural decision in this capability is a resolved configuration value, and without resolution there is no defined behaviour.

## Generated provider conformance tests

**PC-01** A provider bound to `config_resolution` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `config_resolution` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `config_resolution` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

