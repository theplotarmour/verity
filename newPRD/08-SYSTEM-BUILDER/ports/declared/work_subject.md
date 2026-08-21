---
doc_id: PORTC-WORK_SUBJECT
title: Port contract — work_subject
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — work_subject

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

### `assets`

**Cardinality:** `zero_or_many`

Resolve an asset reference to a display label, its location, its state, its criticality and whether it wants to be told about work against it. This is the port that makes an asset a valid subject for a work order without the work capability knowing what an asset is.


## Consumers and their declared behaviour when unbound

### `helpdesk`

**Cardinality:** `zero_or_one`

Resolve a subject reference to a label, a location and a state, so a ticket can be about a specific thing.

**When unbound.** Tickets carry no subject and are about a location or nothing. Categories requiring a subject cannot be used, and history-by-subject - the question of whether this thing has broken before - is unavailable.

### `lease_management`

**Cardinality:** `zero_or_one`

Resolve a leased space as a subject for work, so that reinstatement, condition and maintenance obligations against it can be raised as work.

**When unbound.** Reinstatement and condition obligations are recorded as text on the lease and nothing is raised. They are then remembered by a person, which is the failure this capability exists to replace, and the surface says so at lease end.

### `work_order`

**Cardinality:** `zero_or_many`

Resolve a subject reference to a display label, a location, a status and whether the subject wants to be told about work against it. THE port that makes this capability reusable - the work order never learns what kind of thing it is working on.


**When unbound.** Work orders carry no subject and are located rather than subjected. Everything else works. The subject field is not shown at all rather than shown empty, because an empty required-looking field is the fastest way to make people invent values for it.


## Generated provider conformance tests

**PC-01** A provider bound to `work_subject` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `work_subject` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `work_subject` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

