---
doc_id: PORTC-PARTY_DIRECTORY
title: Port contract — party_directory
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — party_directory

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Also present in the composition seed.

## Providers

### `party`

**Cardinality:** `exactly_one`

Resolve a party reference to a display name, contactable channels honouring per-purpose consent and suppression, and a permission scope. This is the port every other capability consumes rather than reaching into party's tables.


## Consumers and their declared behaviour when unbound

### `assets`

**Cardinality:** `zero_or_one`

Resolve the owning party for assets belonging to somebody else, and the warranty party for claims.

**When unbound.** Every asset is treated as the tenant's own and warranty parties cannot be recorded. For a business that maintains other people's things this is a material limitation, and the warranty warning degrades to a date with nobody to claim from.

### `billing`

**Cardinality:** `exactly_one`

Resolve the counterparty to a display name, billing address, tax registration status and identifier, payment terms, credit limit and contactable channels.

**When unbound.** FORBIDDEN. An invoice is a demand addressed to somebody. Without a party directory there is no addressee, no tax status and no delivery channel, and every document produced would be unaddressable.

### `booking`

**Cardinality:** `zero_or_one`

Resolve the booking party and the subject party to display names and contactable channels, honouring per-channel consent and suppression.

**When unbound.** Bookings hold a free-text contact name and a single contact string with no consent record and no suppression check. Reminders are still sent, which means they may be sent to somebody who asked not to be contacted. Because that is a real compliance exposure rather than a degraded feature, the pack must either bind the port or disable automated reminders, and pack publication checks for exactly that combination.


### `catalog`

**Cardinality:** `zero_or_one`

Resolve party and party-group price scopes, and a party's registration status for tax treatment.

**When unbound.** Party-scoped and party-group-scoped price rules cannot be created and existing ones do not resolve. Pricing falls back to list, location, channel and contract scopes. The price surface says which scopes are unavailable rather than showing an empty picker.

### `core_authorization`

**Cardinality:** `zero_or_one`

Resolve a party reference to a display name, contactable channels and a permission scope, for the own_customer and own_vendor scopes.

**When unbound.** The own_customer and own_vendor scopes resolve to the empty set and are not offered in the grant picker. External portal roles cannot be granted until a party directory is bound.

### `helpdesk`

**Cardinality:** `zero_or_one`

Resolve the reporter to a display name, their contactable channels with consent, their entitlement and their permission scope.

**When unbound.** Reporters are a raw contact string with no consent record and no history. Replies still go back to the address the report came from, which is the essential behaviour. What is lost is entitlement checking, reporter history and any contract-based routing, and a reporter cannot be recognised across two reports.


### `lease_management`

**Cardinality:** `exactly_one`

Resolve the counterparty to a display name, billing details, contactable channels and permission scope.

**When unbound.** FORBIDDEN. A lease is an agreement with somebody, and without a directory there is no addressee for a charge or a notice.

### `notification`

**Cardinality:** `zero_or_one`

Resolve a party to their channels with per-purpose consent and suppression state, and report a channel becoming suppressed.

**When unbound.** External recipients cannot be resolved and only in-app and push to principals are available. Every message to a counterparty, a consumer or a supplier is unsendable. This is a severe degradation for any pack with an external audience and it is not an error, because an internal-only tenant is a real configuration.


### `order`

**Cardinality:** `zero_or_one`

Resolve the ordering party to a display name, contactable channels and permission scope.

**When unbound.** Every order is anonymous. Account ordering, order history for a party and any party-scoped pricing are unavailable. In-person ordering works completely, which is why this is degraded rather than forbidden.

### `people`

**Cardinality:** `exactly_one`

Resolve party_ref, supplying_party_ref and emergency_contact_ref to display names, contactable channels and permission scope.

**When unbound.** FORBIDDEN. A workforce member is an engagement OF a person. Without the person there is nothing to engage, and duplicating the person here is the failure this capability is designed around.

### `procurement`

**Cardinality:** `exactly_one`

Resolve the supplier to a display name, contactable channels, payment terms, tax registration status and relationship state.

**When unbound.** FORBIDDEN. A purchase is a commitment to somebody. Without a party directory the supplier is free text, no duplicate-invoice control is possible, and no commitment can be sent anywhere.

### `sites`

**Cardinality:** `zero_or_one`

Resolve owning_party_ref to a display name and permission scope, for locations belonging to a counterparty rather than to the tenant.

**When unbound.** owning_party_ref cannot be set and the field is not shown. Every location is treated as the tenant's own. This is correct for a tenant that only operates its own premises and is a real limitation for one that does not, stated rather than hidden.

### `sla_contract`

**Cardinality:** `exactly_one`

Resolve the counterparty to a display name, contactable channels and permission scope.

**When unbound.** FORBIDDEN. A contract is an agreement with somebody. Without a party directory there is no counterparty and no scope for a customer surface.

### `work_order`

**Cardinality:** `zero_or_one`

Resolve the requesting party to a display name, contactable channels and permission scope.

**When unbound.** Work orders carry no requesting party. Externally originated work cannot be attributed to whoever asked for it, which removes the ability to tell them anything about it.

## Generated provider conformance tests

**PC-01** A provider bound to `party_directory` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `party_directory` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `party_directory` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

