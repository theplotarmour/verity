---
doc_id: PORT-FINANCIAL_DOCUMENT_SINK
title: Port contract — financial_document_sink
generated: true
source_model: _model/_composition.yaml
regenerate_with: python3 _tools/generate.py
---

# Port contract — financial_document_sink

*Generated. Edit `_model/_composition.yaml`, not this file.*

**Direction:** `requires` · **Cardinality:** `zero_or_one`

**Contract.** produce a legally valid document, including jurisdiction-specific requirements such as IRN and QR

**Declared by.** `billing`

**Behaviour when unbound.** An internal invoice is produced and clearly marked not-tax-valid.

## Generated provider conformance tests

**PC-01** A provider bound to `financial_document_sink` satisfies every element of the contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `financial_document_sink` unbound, every declaring capability behaves exactly as stated under *Behaviour when unbound*, with no orphaned UI affordance and no error surfaced to the user.

**PC-03** Rebinding `financial_document_sink` from provider A to provider B leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

