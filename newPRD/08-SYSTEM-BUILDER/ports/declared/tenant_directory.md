---
doc_id: PORTC-TENANT_DIRECTORY
title: Port contract — tenant_directory
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — tenant_directory

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

### `hq_console`

**Cardinality:** `exactly_one`

Resolve a tenant reference to its display name, its commercial state, its residency, its locale and timezone, and whether it is suspended. This is the port every tenant_scoped capability consumes rather than holding a foreign key to the tenant entity, because tenant is owned here and kernel K04 forbids the concrete reference.


## Consumers and their declared behaviour when unbound

### `core_identity_session`

**Cardinality:** `exactly_one`

Resolve the tenant a membership or session belongs to, its suspension state, its locale and its timezone.

**When unbound.** FORBIDDEN. A session is a claim about a principal AND a device AND a tenant AND a time window; without the tenant there is no third element and nothing to scope a session to. Declared explicitly so that tenant_membership.tenant_id is visibly a port-resolved reference rather than a foreign key into hq_console, which kernel K04 forbids.


## Generated provider conformance tests

**PC-01** A provider bound to `tenant_directory` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `tenant_directory` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `tenant_directory` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

