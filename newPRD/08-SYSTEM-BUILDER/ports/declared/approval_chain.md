---
doc_id: PORTC-APPROVAL_CHAIN
title: Port contract — approval_chain
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — approval_chain

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Also present in the composition seed.

## Providers

> **GAP [modelling] — no capability in the library declares that it provides this port; it is either satisfied by a system outside Verity, or its provider has not been modelled. See _composition.yaml external_provider_ports and ports_awaiting_a_capability.**  
> Location: `port.approval_chain.provider` · Capability: `approval_chain`  
> **Blocks:** `capability:attendance_verification`, `capability:backfill_dispatch`, `capability:core_authorization`, `capability:core_configuration`, `capability:people`, `capability:procurement`, `capability:scheduling_dispatch`, `capability:sla_contract`, `capability:work_order`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.

## Consumers and their declared behaviour when unbound

### `attendance_verification`

**Cardinality:** `zero_or_one`

Route adjustments and unverified settlements for approval.

**When unbound.** Adjustments apply immediately with an audit note recording that no approval chain was configured. The notification obligation for downward pay adjustments is NOT waived by an unbound approval chain.

### `backfill_dispatch`

**Cardinality:** `zero_or_one`

Route premium authorisations beyond policy, and reductions of required_count, for approval.

**When unbound.** The dispatcher may authorise a premium beyond policy directly, with a mandatory reason, and every such authorisation is reported to finance. Deliberately not blocked - a commitment failing at 5am because nobody could approve an extra payment is a worse outcome than an unapproved premium, and the record makes it reviewable afterwards.


### `core_authorization`

**Cardinality:** `zero_or_one`

Submit a permission change for approval, resolve approvers from role and scope, record the decision with a reason.

**When unbound.** Permission changes execute immediately with an audit note recording that no approval chain was configured. Deliberately not an error - a two-person business cannot four-eyes its own administrator, and refusing to operate would make the platform unusable for the smallest customers, who are the majority.


### `core_configuration`

**Cardinality:** `zero_or_one`

Route a change set for approval, resolve approvers from role and scope, record the decision with a reason.

**When unbound.** Change sets are approved by the acting tenant_admin themselves, with an audit note recording that no approval chain was configured. The staging requirement is NOT waived - a chain being unbound removes the second pair of eyes, not the test run.

### `people`

**Cardinality:** `zero_or_one`

Route absence requests and qualification overrides for approval, resolving approvers from role and scope.

**When unbound.** Absences are approved by any principal holding approve on absence at a scope covering the member, and qualification overrides are recorded with the overriding principal and a mandatory reason. The audit note records that no chain was configured.

### `procurement`

**Cardinality:** `zero_or_one`

Route requests and commitments for approval, resolving approvers from role, scope and value.

**When unbound.** Requests are approved by any principal holding approve at a covering scope, and commitments above the threshold are approved by finance or tenant_owner directly, with an audit note recording that no chain was configured. The value thresholds still apply - an unbound chain removes the routing, not the control.


### `scheduling_dispatch`

**Cardinality:** `zero_or_one`

Route overtime, cost-ceiling breach and unavailable-resource overrides for approval.

**When unbound.** The action executes immediately with an audit note recording that no approval chain was configured. Overtime and ceiling breaches are still computed, recorded and reported - the approval is what is missing, not the visibility.

### `sla_contract`

**Cardinality:** `zero_or_one`

Route penalty approvals, waivers, measurement exclusions and contract activation for approval.

**When unbound.** Actions execute with the acting principal recorded and an audit note that no chain was configured. Exclusions and waivers are still counted and reported, because the rate is the control that matters more than the individual approval.

### `work_order`

**Cardinality:** `zero_or_one`

Route evidence overrides, cost overruns and cancellation of in-progress work for approval.

**When unbound.** The action executes immediately with an audit note recording that no approval chain was configured. Overrides are still counted and reported.

## Generated provider conformance tests

**PC-01** A provider bound to `approval_chain` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `approval_chain` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `approval_chain` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

