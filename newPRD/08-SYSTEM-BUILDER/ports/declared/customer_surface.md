---
doc_id: PORTC-CUSTOMER_SURFACE
title: Port contract — customer_surface
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — customer_surface

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Also present in the composition seed.

## Providers

> **GAP [modelling] — no capability in the library declares that it provides this port; it is either satisfied by a system outside Verity, or its provider has not been modelled. See _composition.yaml external_provider_ports and ports_awaiting_a_capability.**  
> Location: `port.customer_surface.provider` · Capability: `customer_surface`  
> **Blocks:** `capability:attendance_verification`, `capability:billing`, `capability:booking`, `capability:helpdesk`, `capability:lease_management`, `capability:order`, `capability:sla_contract`, `capability:work_order`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.

## Consumers and their declared behaviour when unbound

### `attendance_verification`

**Cardinality:** `zero_or_one`

Expose a permissioned projection of attendance to a counterparty and accept their attestation or dispute.

**When unbound.** counterparty_attested strength is unreachable and counterparties cannot raise disputes in the system. They will raise them by telephone instead, and those disputes will not appear in any report - which is the cost of leaving this unbound and is stated rather than left to be discovered.

### `billing`

**Cardinality:** `zero_or_one`

Expose invoices, statements and payment position to the counterparty, and accept line-level disputes and payment notifications from them.

**When unbound.** Documents are delivered by whatever channel the notification port offers and disputes arrive by telephone and email, which means they exist nowhere in the record. Every dispute metric in this capability under-reports by an unknown amount, and that is stated rather than left to be inferred.

### `booking`

**Cardinality:** `zero_or_one`

Expose a permissioned projection to the booking party for self-service booking, rescheduling and cancellation.

**When unbound.** All bookings are staff-entered or arrive by integration. Self-service channels are unavailable and the channel enum values for them are never produced. Everything else works.

### `helpdesk`

**Cardinality:** `zero_or_one`

Expose a ticket to its reporter, accept replies, confirmations and reopens from them, and show them their own history.

**When unbound.** Reporters interact only through whatever channel they used. They cannot see status, cannot confirm a resolution and cannot reopen in the system, so the confirmation window closes on silence and reopens arrive as new tickets by telephone. Every reopen metric under-reports by an unknown amount, which is stated rather than left to be inferred.


### `lease_management`

**Cardinality:** `zero_or_one`

Expose the lease, its schedule, its charges and its deposit position to the counterparty, and accept notices and disputes from them.

**When unbound.** Counterparties see nothing and communicate by email and telephone. Notices served by them arrive outside the system and are entered by hand, with whatever delay that introduces on a date-critical obligation.

### `order`

**Cardinality:** `zero_or_one`

Expose a permissioned projection to the ordering party for placing, tracking and modifying an order.

**When unbound.** Self-service channels are unavailable and their channel values are never produced. Staff-entered and integration ordering are unaffected.

### `sla_contract`

**Cardinality:** `zero_or_one`

Expose a permissioned performance projection to the counterparty, and accept measurement and penalty disputes from them.

**When unbound.** Performance is internal only. Counterparties will request reports by email and dispute by telephone, and neither will appear in any record - which is the cost of leaving this unbound and is stated rather than discovered.

### `work_order`

**Cardinality:** `zero_or_one`

Expose a permissioned external projection of a work order to the requesting party, and accept their sign-off or rejection.

**When unbound.** signoff_by=requesting_party cannot be configured, and existing work types using it fall back to supervisor sign-off with the substitution recorded on each order. The counterparty is never silently deemed to have signed.

## Generated provider conformance tests

**PC-01** A provider bound to `customer_surface` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `customer_surface` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `customer_surface` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

