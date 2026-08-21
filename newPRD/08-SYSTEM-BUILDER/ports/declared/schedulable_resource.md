---
doc_id: PORTC-SCHEDULABLE_RESOURCE
title: Port contract — schedulable_resource
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — schedulable_resource

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Also present in the composition seed.

## Providers

### `assets`

**Cardinality:** `zero_or_many`

Publish an in-service asset as a schedulable resource with its availability and capabilities, for operations that schedule things rather than only people.

### `people`

**Cardinality:** `zero_or_many`

Publish each active member as a resource with availability, capacity, a qualification set and calendar exceptions. The contract carries a reason CODE when a member is unavailable and never the reason TEXT, because the text may be health information and the scheduler has no business reading it.


## Consumers and their declared behaviour when unbound

### `attendance_verification`

**Cardinality:** `exactly_one`

Resolve the person to a display name, their commitments, and their engagement status.

**When unbound.** FORBIDDEN. Attendance is a fact about a person against a commitment. Without a resource provider there is nobody to attend and no commitment to attend against.

### `backfill_dispatch`

**Cardinality:** `exactly_one`

Resolve candidates with their availability, qualifications, hours headroom, distance to the location and a single reason code when unavailable. Ranking factors are computed from this and nothing else.


**When unbound.** FORBIDDEN. Backfill with no source of candidates has nothing to do. The capability is meaningless without it and declaring it FORBIDDEN makes the dependency explicit at pack publication.

### `booking`

**Cardinality:** `exactly_one`

Resolve resource availability for the requested window and hold or assign a resource against a confirmed booking.

**When unbound.** FORBIDDEN. A booking is a reservation of somebody's or something's time. With no resource provider there is nothing to reserve and every booking would be an unbacked promise.

### `scheduling_dispatch`

**Cardinality:** `zero_or_many`

A resource with availability, capacity, a qualification set, calendar exceptions and a single reason code when unavailable. The engine never learns what kind of thing it is.


**When unbound.** No assignments can be made. Demand is still recorded, still ages, and still reports its coverage shortfall, so the tenant can see what would need staffing. The scheduling surface shows demand only, with an explicit statement that no resource provider is bound - rather than an empty resource picker, which reads as a fault.


### `work_order`

**Cardinality:** `zero_or_one`

Resolve the assigned resource to a display name and availability, for showing who is doing the work.

**When unbound.** assigned_resource_ref cannot be set and work orders are worked by whoever picks them up, with the actor recorded at start_work. This is a materially different operating model and the surface reflects it rather than showing an empty assignee.

## Generated provider conformance tests

**PC-01** A provider bound to `schedulable_resource` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `schedulable_resource` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `schedulable_resource` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

