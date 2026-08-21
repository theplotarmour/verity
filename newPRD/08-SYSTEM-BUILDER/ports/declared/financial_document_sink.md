---
doc_id: PORTC-FINANCIAL_DOCUMENT_SINK
title: Port contract — financial_document_sink
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — financial_document_sink

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Also present in the composition seed.

## Providers

> **GAP [modelling] — no capability in the library declares that it provides this port; it is either satisfied by a system outside Verity, or its provider has not been modelled. See _composition.yaml external_provider_ports and ports_awaiting_a_capability.**  
> Location: `port.financial_document_sink.provider` · Capability: `financial_document_sink`  
> **Blocks:** `capability:assets`, `capability:billing`, `capability:inventory`, `capability:party`, `capability:procurement`, `capability:sla_contract`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.

## Consumers and their declared behaviour when unbound

### `assets`

**Cardinality:** `zero_or_one`

Report acquisition, depreciation, impairment and disposal movements for the accounting period.

**When unbound.** Depreciation is computed and reported here and posted nowhere. The register produces a schedule to be read rather than entries, which is how a business with an external accountant operates.

### `billing`

**Cardinality:** `zero_or_one`

Register a document with the external authority and return the reference and code that make it legally valid, or return a rejection reason. Report the applicable registration deadline.


**When unbound.** An internal invoice is produced and clearly marked not-tax-valid, on the document itself and in every covering message. This is the composition model's declared behaviour for this port. It is a legitimate configuration for a tenant below the registration threshold and it is NOT a legitimate configuration for one above it, so pack publication must check the tenant's registration_required setting against the binding.


### `inventory`

**Cardinality:** `zero_or_one`

Report valuation movements - the value of consumption, wastage and count corrections - for the accounting period.

**When unbound.** Valuation is computed and reported within this capability and is not posted anywhere. Cost of consumption exists as a figure to be read rather than as an entry, which is exactly how a business with an external accountant operates.

### `party`

**Cardinality:** `zero_or_one`

Report the party attributes a legally valid financial document requires, so that a missing registration attribute is discovered when the party is created rather than when the document is issued.

**When unbound.** No document requirements are known, so no attribute is mandatory beyond display_name. The party form shows no tax fields at all rather than showing them as optional, because an optional field somebody skipped is how an invoice becomes unissuable a month later.

### `procurement`

**Cardinality:** `zero_or_one`

Post matched supplier invoices, credit notes and accruals for the accounting period, and return a reference.

**When unbound.** Invoices are matched, approved and recorded here and posted nowhere. The payable position exists as a report to be read rather than as an entry, which is exactly how a business with an external accountant operates and is not an error.

### `sla_contract`

**Cardinality:** `zero_or_one`

Accept an approved penalty obligation and produce the corresponding credit or adjustment, returning a reference.

**When unbound.** Obligations are calculated, approved and recorded, and never applied. They appear as an outstanding list with their totals so a human can apply them elsewhere. This is deliberately not an error - a tenant may run billing outside Verity and still want the measurement.


## Generated provider conformance tests

**PC-01** A provider bound to `financial_document_sink` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `financial_document_sink` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `financial_document_sink` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

