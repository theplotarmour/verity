---
doc_id: PORT-SCHEDULABLE_RESOURCE
title: Port contract — schedulable_resource
generated: true
source_model: _model/_composition.yaml
regenerate_with: python3 _tools/generate.py
---

# Port contract — schedulable_resource

*Generated. Edit `_model/_composition.yaml`, not this file.*

**Direction:** `provides` · **Cardinality:** `zero_or_one`

**Contract.** an entity that has availability, capacity, qualifications and calendar exceptions

**Declared by.** `people`, `assets`, `spaces`

**Behaviour when unbound.** GAP

**Note.** This is the port that makes one scheduling engine serve guards, doctors, technicians, tables and machines. Scheduling never knows what kind of thing it is scheduling.

## Generated provider conformance tests

**PC-01** A provider bound to `schedulable_resource` satisfies every element of the contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `schedulable_resource` unbound, every declaring capability behaves exactly as stated under *Behaviour when unbound*, with no orphaned UI affordance and no error surfaced to the user.

**PC-03** Rebinding `schedulable_resource` from provider A to provider B leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

