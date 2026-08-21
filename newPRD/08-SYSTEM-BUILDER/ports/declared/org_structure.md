---
doc_id: PORTC-ORG_STRUCTURE
title: Port contract — org_structure
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — org_structure

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

### `sites`

**Cardinality:** `exactly_one`

Resolve the concrete membership sets behind the scope vocabulary - which locations a principal is assigned to, which locations roll up into which region - as an identifier set plus a cache-invalidation signal. This is the port core_authorization consumes to make own_site and own_region mean anything.


## Consumers and their declared behaviour when unbound

### `assets`

**Cardinality:** `zero_or_one`

Resolve asset locations and the site partition.

**When unbound.** Assets carry no location and are tenant-scoped. Location-based work routing and the whole notion of an asset being somewhere are unavailable, which for a register of fixed things is a material loss and for a register of things people carry is almost none.

### `attendance_verification`

**Cardinality:** `zero_or_one`

Resolve the location and its operating calendar, so that operating_day and any premium period can be computed.

**When unbound.** operating_day falls back to calendar date in the tenant timezone. For any continuously operating location this misattributes every overnight period, which surfaces as a pay dispute and a billing dispute from one defect. The fallback is recorded on each affected record rather than applied silently.

### `backfill_dispatch`

**Cardinality:** `zero_or_one`

Resolve the location for distance ranking and for the escalation audience.

**When unbound.** Distance drops out of the ranking entirely and the factors say so on every offer. Ranking falls back to qualification match, hours headroom and recent decline rate, which for a geographically dispersed workforce is materially worse and is stated rather than silently degraded.

### `booking`

**Cardinality:** `zero_or_one`

Resolve the location and its operating calendar, so that bookable windows respect opening hours.

**When unbound.** Bookings can be made at any time, including when a location is closed. Staff will catch most of these and some will reach a person who arrives at a closed door. Stated plainly rather than left implicit.

### `catalog`

**Cardinality:** `zero_or_one`

Resolve location-scoped price rules and location-scoped availability.

**When unbound.** Location-scoped pricing and availability are unavailable. Every item is available everywhere at its non-location price, which for a multi-location tenant is materially wrong and is stated rather than silently applied.

### `core_authorization`

**Cardinality:** `zero_or_one`

Resolve the concrete membership sets behind the scope vocabulary - which locations a principal is assigned to, which teams they manage, which regions those locations roll up into, which department they belong to. Must expose the resolution as a set of identifiers plus a cache-invalidation signal, never as a query the caller composes, because a caller composing the query would need to know the provider's schema.


**When unbound.** Every scope except own, tenant and platform resolves to the EMPTY set, which denies rather than permits. A tenant with no org structure capability installed can express "your own records" and "the whole tenant" and nothing in between. The UI does not offer the unresolvable scopes in the grant picker rather than offering them and having them silently deny - an offered scope that grants nothing is the most expensive kind of confusion because it looks like it worked.


### `core_configuration`

**Cardinality:** `zero_or_one`

Resolve site-scoped and role-scoped configuration targets, and expose the hierarchy so a site value can be shown alongside the tenant value it overrides.

**When unbound.** The site scope is not offered in the configuration surface and no site-scoped value can be written. Existing site-scoped values, if a capability was disabled after they were written, are retained and do NOT participate in resolution - they resolve as if absent. The surface states that N site-scoped values are dormant, so the difference between "not set" and "set but unresolvable" is visible rather than silent.


### `core_identity_session`

**Cardinality:** `zero_or_one`

Resolve a device's bound site, so that a site-bound station cannot mint sessions for another site.

**When unbound.** device.bound_site_id cannot be set and no device is site-restricted. Every shared station can hold a session for any site the principal can reach, which is a materially weaker posture and is stated rather than silently applied.

### `helpdesk`

**Cardinality:** `zero_or_one`

Resolve locations, queue scoping and the business-hours calendar for response measurement.

**When unbound.** Tickets carry no location, queues cannot be scoped by location, and response targets are measured in wall time rather than business hours. The last of these silently makes every target roughly three times harder, and it is stated on every measurement rather than assumed.

### `inventory`

**Cardinality:** `zero_or_one`

Resolve the site a stock location belongs to and the site partition for scoping.

**When unbound.** Stock locations exist without a site and every balance is tenant-scoped. For a multi-site tenant this makes stock visible across sites that should not see each other, which is a real disclosure and is stated rather than silently applied.

### `kitchen_flow`

**Cardinality:** `zero_or_one`

Resolve the location and its operating day boundary, so that sequence numbers reset correctly.

**When unbound.** Sequence numbers reset at calendar midnight in the tenant timezone. For any operation running past midnight this restarts numbering mid-service, which is confusing at exactly the busiest moment and is stated rather than discovered.

### `notification`

**Cardinality:** `zero_or_one`

Resolve relationship-based audiences such as the supervisor of a location, and resolve the location calendar for quiet hours that follow a site rather than a person.

**When unbound.** Relationship-based audiences reduce to role-at-tenant-scope, which means a message intended for one location's supervisor reaches every supervisor. That is noisy rather than broken, and the noise is what makes people stop reading.

### `people`

**Cardinality:** `zero_or_one`

Resolve primary_location_ref and the site partition, and expose the location hierarchy so that a member's visibility can be scoped.

**When unbound.** primary_location_ref cannot be set. Every member is visible at tenant scope only, which is a materially weaker privacy posture than the model intends and is stated as such, because a workforce list visible to every supervisor in a large tenant is a disclosure.

### `procurement`

**Cardinality:** `zero_or_one`

Resolve the requesting and delivery locations and the approval scope hierarchy.

**When unbound.** Requests and commitments are tenant-scoped with no location. Approval routing by location is unavailable and every approver sees everything, which for a multi-site tenant is both a workload problem and a disclosure.

### `reporting`

**Cardinality:** `zero_or_one`

Resolve location and region dimensions and their hierarchy for roll-up.

**When unbound.** Location and region dimensions are unavailable and every report is tenant-wide. For a multi-site tenant this removes the comparison that most reports exist to make.

### `scheduling_dispatch`

**Cardinality:** `zero_or_one`

Resolve locations for demand and for the site partition, and expose the hierarchy for dispatcher scope.

**When unbound.** Demand and assignments carry no location. Distance and travel considerations are unavailable and the optimiser degrades to qualification and availability matching only, which is stated on every proposal it makes.

### `sla_contract`

**Cardinality:** `zero_or_one`

Resolve contract scope locations and the location of each measured subject.

**When unbound.** Contract scope falls back to the whole tenant or to the scope expression alone. Location-specific service levels cannot be expressed, and any contract relying on them cannot be activated rather than being activated with a scope that quietly covers everything.

## Generated provider conformance tests

**PC-01** A provider bound to `org_structure` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `org_structure` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `org_structure` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

