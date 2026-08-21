---
doc_id: PORTC-WORK_GENERATION
title: Port contract — work_generation
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — work_generation

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

### `work_order`

**Cardinality:** `zero_or_many`

Raise a unit of work of a stated type against a subject and a location for a due date, and report its progress, its outcome and its cancellation back to whoever raised it. The raiser never learns how the work was scheduled, evidenced or completed.


## Consumers and their declared behaviour when unbound

### `assets`

**Cardinality:** `zero_or_one`

Raise a unit of work of a stated type against an asset for a due date, and report back when it completes or is cancelled.

**When unbound.** Plans compute their due dates and generate NOTHING. The due list exists and is visible and nobody is dispatched. This is genuinely useful as a register with a reminder list and it is not maintenance management, and the surface says which of the two the tenant has.


### `helpdesk`

**Cardinality:** `zero_or_one`

Raise a unit of work of a stated type against a subject and location, and report its progress and completion back.

**When unbound.** Tickets are resolved by conversation alone. Anything requiring a visit is tracked in the ticket body, which works for an advisory helpdesk and not for one whose tickets become site visits. The category configuration refuses conversion settings while unbound, so the limitation surfaces at configuration rather than at 8am with a reporter waiting.


## Generated provider conformance tests

**PC-01** A provider bound to `work_generation` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `work_generation` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `work_generation` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

