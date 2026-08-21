---
doc_id: PORTC-MEASURABLE_EVENT
title: Port contract — measurable_event
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — measurable_event

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

### `helpdesk`

**Cardinality:** `zero_or_many`

Emit ticket lifecycle events a service level measures against - raised, first response, resolved, reopened - with the category, the location and the priority.

### `work_order`

**Cardinality:** `zero_or_many`

Emit the lifecycle events a service level measures against - submitted, first assigned, started, held, resumed, completed - with the subject, the location and the priority, so a clock can be started, paused and stopped against them.

## Consumers and their declared behaviour when unbound

### `sla_contract`

**Cardinality:** `zero_or_many`

Subscribe to start and stop events from any capability, and resolve a subject reference to a display label, a location, a priority and its current state. The subject is opaque throughout - this capability never learns what kind of record it is measuring.


**When unbound.** No measurements are created. Contracts still exist, still hold their terms, and measure nothing. The surface states that no measurable source is bound rather than showing a performance report of zero breaches, because a report of zero breaches with nothing measured is the most dangerous artefact this capability could produce.


## Generated provider conformance tests

**PC-01** A provider bound to `measurable_event` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `measurable_event` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `measurable_event` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

