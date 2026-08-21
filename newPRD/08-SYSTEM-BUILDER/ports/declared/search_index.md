---
doc_id: PORTC-SEARCH_INDEX
title: Port contract — search_index
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — search_index

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

### `search`

**Cardinality:** `exactly_one`

Accept a term, a filter set and a principal context; return identifiers, display fields and a stated index lag, having applied the principal's scope filter at query time and re-checked every returned identifier against the authorization port. The re-check is part of the contract, not an implementation detail - a provider that returns index results unchecked does not satisfy it.


## Consumers and their declared behaviour when unbound

No capability in the library requires this port.

## Generated provider conformance tests

**PC-01** A provider bound to `search_index` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `search_index` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `search_index` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

