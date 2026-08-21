---
doc_id: PORTC-BOOKABLE_OFFERING
title: Port contract — bookable_offering
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — bookable_offering

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

### `catalog`

**Cardinality:** `zero_or_many`

Resolve a time_based item to a duration, a required qualification set, a capacity and a price basis.

## Consumers and their declared behaviour when unbound

### `booking`

**Cardinality:** `zero_or_one`

Resolve an offering reference to a display label, a duration, a required qualification set, a capacity and a price basis. The offering is opaque here - this capability never learns what kind of thing is being booked.


**When unbound.** Bookings carry no offering and are pure time reservations against a resource. Duration must be entered manually rather than derived, and no price can be computed, which means deposits and cancellation charges cannot be calculated as percentages. The policy fields that depend on a price are hidden rather than shown as zero.


## Generated provider conformance tests

**PC-01** A provider bound to `bookable_offering` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `bookable_offering` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `bookable_offering` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

