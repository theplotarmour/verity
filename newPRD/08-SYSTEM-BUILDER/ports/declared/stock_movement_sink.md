---
doc_id: PORTC-STOCK_MOVEMENT_SINK
title: Port contract — stock_movement_sink
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — stock_movement_sink

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Also present in the composition seed.

## Providers

### `inventory`

**Cardinality:** `exactly_one`

Accept consume, reserve, release, return and scrap requests against an item at a location, and report available and on-hand quantities separately. A caller that cannot distinguish the two will promise stock it does not have.


## Consumers and their declared behaviour when unbound

### `assets`

**Cardinality:** `zero_or_one`

Record parts consumed against an asset, so that lifetime cost is derivable.

**When unbound.** Lifetime cost includes labour and external cost only. Parts appear as free text on the underlying work orders, so total cost of ownership is understated by an unknown amount rather than being wrong by a known one, and the surface says so.

### `kitchen_flow`

**Cardinality:** `zero_or_one`

Consume component quantities at the location when a step completes.

**When unbound.** No consumption is recorded. Preparation works completely; stock does not move. This is the correct behaviour for an operation with no stock system and it means component availability cannot constrain what is accepted.

### `order`

**Cardinality:** `zero_or_one`

Reserve, consume, release and return quantities of components at a location against a line.

**When unbound.** No reservation and no consumption. Availability cannot be constrained by quantity, so an item sells until somebody notices it has run out. The composite availability degradation declared by the catalogue capability is the same failure seen from here.

### `procurement`

**Cardinality:** `zero_or_one`

Write receipt, return and rejection movements at a stock location, and hold reservations against expected receipts.

**When unbound.** Receipts are recorded as documents with no stock effect. Everything commercial - the three-way match, variance control, duplicate detection - still works completely. What is lost is any connection between what was bought and what is held, so a low balance can never trigger a request. This is a legitimate configuration for a business that buys services and consumables it does not track.


### `work_order`

**Cardinality:** `zero_or_one`

Consume, reserve, return or scrap a quantity of an item at a location.

**When unbound.** Parts used are recorded as free text on the work order for billing evidence, with no stock effect. This is deliberately not an error - a business with no stock system still needs to record what it fitted, and the free text is what a billing dispute is settled with.

## Generated provider conformance tests

**PC-01** A provider bound to `stock_movement_sink` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `stock_movement_sink` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `stock_movement_sink` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

