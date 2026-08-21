---
doc_id: PORTC-MANIFEST_AUTHORITY
title: Port contract — manifest_authority
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — manifest_authority

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

### `hq_console`

**Cardinality:** `exactly_one`

Resolve the current manifest for a tenant - enabled capabilities, port bindings including nulls, resolved configuration and role expansions - and report drift against the running system.

## Consumers and their declared behaviour when unbound

No capability in the library requires this port.

## Generated provider conformance tests

**PC-01** A provider bound to `manifest_authority` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `manifest_authority` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `manifest_authority` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

