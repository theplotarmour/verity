---
doc_id: PORTC-PAYMENT_AUTHORISATION
title: Port contract — payment_authorisation
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — payment_authorisation

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

> **GAP [modelling] — no capability in the library declares that it provides this port; it is either satisfied by a system outside Verity, or its provider has not been modelled. See _composition.yaml external_provider_ports and ports_awaiting_a_capability.**  
> Location: `port.payment_authorisation.provider` · Capability: `payment_authorisation`  
> **Blocks:** `capability:billing`, `capability:booking`, `capability:order`, `capability:procurement`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.

## Consumers and their declared behaviour when unbound

### `billing`

**Cardinality:** `zero_or_one`

Initiate and confirm a collection from a counterparty and return a reference, and report inbound receipts for reconciliation.

**When unbound.** Receipts are recorded manually by finance from a bank statement. This is how most of the target market operates and is a first-class path rather than a fallback. Automated collection and payment links are unavailable and are not offered.

### `booking`

**Cardinality:** `zero_or_one`

Take, hold, capture, release and refund a deposit against a booking, returning a reference. This capability never holds a payment credential.

**When unbound.** Deposits cannot be taken. Any cancellation policy with a non-zero deposit_percent cannot be published, and existing bookings referencing one treat the deposit as unpaid. Charges are still calculated and recorded as amounts owed rather than collected.


### `order`

**Cardinality:** `zero_or_one`

Authorise, capture, void and refund a payment against an order, returning a reference. This capability never holds a payment credential.

**When unbound.** Payment is recorded as an amount and a method with no authorisation and no reference. This is exactly how a cash operation works and it is not an error. Card and digital methods are unavailable and are not offered rather than being offered and failing.

### `procurement`

**Cardinality:** `zero_or_one`

Execute an approved payment against a supplier and return a reference. This capability never holds a payment credential and never moves money.

**When unbound.** Payment is recorded manually as a reference and a date entered by finance. This is how most of the target market pays suppliers and it is a first-class path rather than a fallback.

## Generated provider conformance tests

**PC-01** A provider bound to `payment_authorisation` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `payment_authorisation` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `payment_authorisation` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

