---
doc_id: PORTC-CONFIG_CHANGE_FEED
title: Port contract — config_change_feed
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — config_change_feed

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

### `core_configuration`

**Cardinality:** `zero_or_many`

An ordered stream of applied configuration changes for consumers that cache resolved values, carrying the key, the scope, and the invalidation set.

## Consumers and their declared behaviour when unbound

No capability in the library requires this port.

## Generated provider conformance tests

**PC-01** A provider bound to `config_change_feed` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `config_change_feed` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `config_change_feed` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

