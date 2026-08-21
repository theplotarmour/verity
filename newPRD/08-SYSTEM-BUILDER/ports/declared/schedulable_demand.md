---
doc_id: PORTC-SCHEDULABLE_DEMAND
title: Port contract — schedulable_demand
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — schedulable_demand

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Also present in the composition seed.

## Providers

### `booking`

**Cardinality:** `zero_or_many`

Publish a confirmed booking as a unit of demand with its window, location, required qualifications and count, and withdraw it on cancellation.

### `work_order`

**Cardinality:** `zero_or_many`

Publish a submitted work order as a unit of demand with its window, required qualifications, location, count and priority, and withdraw it on cancellation.

## Consumers and their declared behaviour when unbound

### `attendance_verification`

**Cardinality:** `zero_or_one`

Resolve the commitment being attended, its window and its location, and accept coverage confirmation.

**When unbound.** Attendance is recorded without a commitment - a bare period at a location. Everything downstream still works, and nothing can be compared against what was expected, so lateness, early departure and no-show cease to be computable. Stated plainly because a tenant may not realise those three metrics come from the scheduler rather than from here.


### `backfill_dispatch`

**Cardinality:** `exactly_one`

Receive the signal that a commitment lost cover, resolve its window, location, qualifications and required count, and accept the resulting cover.

**When unbound.** FORBIDDEN. There is nothing to backfill without a commitment.

### `scheduling_dispatch`

**Cardinality:** `zero_or_many`

A unit of demand with a window, a required qualification set, a location, a required count and a priority, plus a cancellation signal.

**When unbound.** No demand exists, so there is nothing to schedule. The capability is inert rather than broken, and the surface says so. Deliberately not an error - a tenant may install scheduling ahead of the capability that will feed it.

## Generated provider conformance tests

**PC-01** A provider bound to `schedulable_demand` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `schedulable_demand` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `schedulable_demand` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

