---
doc_id: PORTC-AUDIT_QUERY
title: Port contract — audit_query
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — audit_query

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

### `core_audit`

**Cardinality:** `exactly_one`

A permission-projected, paginated, filterable read over audit records, plus an export path that is itself audited.

## Consumers and their declared behaviour when unbound

No capability in the library requires this port.

## Generated provider conformance tests

**PC-01** A provider bound to `audit_query` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `audit_query` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `audit_query` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

