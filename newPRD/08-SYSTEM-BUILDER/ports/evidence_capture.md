---
doc_id: PORT-EVIDENCE_CAPTURE
title: Port contract — evidence_capture
generated: true
source_model: _model/_composition.yaml
regenerate_with: python3 _tools/generate.py
---

# Port contract — evidence_capture

*Generated. Edit `_model/_composition.yaml`, not this file.*

**Direction:** `requires` · **Cardinality:** `zero_or_one`

**Contract.** capture and attach photo, geolocation, signature, scan or form response with tamper-evidence

**Declared by.** `attendance_verification`, `work_order`, `quality_inspection`, `delivery`

**Behaviour when unbound.** Actions requiring evidence become unavailable and the reason is shown, rather than silently permitting unevidenced completion.

## Generated provider conformance tests

**PC-01** A provider bound to `evidence_capture` satisfies every element of the contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `evidence_capture` unbound, every declaring capability behaves exactly as stated under *Behaviour when unbound*, with no orphaned UI affordance and no error surfaced to the user.

**PC-03** Rebinding `evidence_capture` from provider A to provider B leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

