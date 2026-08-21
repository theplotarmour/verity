---
doc_id: PORTC-LOCATION_CALENDAR
title: Port contract — location_calendar
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — location_calendar

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

### `sites`

**Cardinality:** `exactly_one`

Given a location and an instant, return whether it is operating, the operating-day it belongs to given day_boundary_time, and any exception in force with its kind and label.

## Consumers and their declared behaviour when unbound

### `scheduling_dispatch`

**Cardinality:** `zero_or_one`

Given a location and an instant, return whether it operates and which operating day the instant belongs to.

**When unbound.** Operating hours are not consulted. Demand may be scheduled at times a location is closed, and overnight periods are attributed by calendar midnight rather than by the location's day boundary. The second of those is a silent correctness failure in every downstream hours calculation and it is stated here rather than discovered in a payroll dispute.


### `sla_contract`

**Cardinality:** `zero_or_one`

Given a calendar and an instant, return whether it is operating, so that business-hours targets can be computed.

**When unbound.** business_hours and business_days targets cannot be measured and their service levels cannot be activated. Wall-clock targets are unaffected. The refusal is deliberate: a business-hours target silently measured in wall hours is roughly three times harder to breach, so the tenant would see excellent performance against a target nobody is actually meeting.


## Generated provider conformance tests

**PC-01** A provider bound to `location_calendar` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `location_calendar` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `location_calendar` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

