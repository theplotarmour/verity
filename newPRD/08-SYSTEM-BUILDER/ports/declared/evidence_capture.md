---
doc_id: PORTC-EVIDENCE_CAPTURE
title: Port contract — evidence_capture
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — evidence_capture

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Also present in the composition seed.

## Providers

### `evidence_capture`

**Cardinality:** `exactly_one`

Open a capture session against a subject, declare its requirements, accept items, close the session atomically with the caller's own mutation, and later resolve an item reference to its content, its metadata, its integrity state and its verdict. The atomicity of the close with the caller's mutation is part of the contract, not an implementation note - a provider that accepts evidence independently of the act does not satisfy it.


## Consumers and their declared behaviour when unbound

### `assets`

**Cardinality:** `zero_or_one`

Attach photographs to meter readings, condition assessments and disposals.

**When unbound.** Readings and conditions are recorded without evidence. A disputed reading becomes one person's word, which matters most where readings drive billing or warranty claims.

### `attendance_verification`

**Cardinality:** `zero_or_one`

Capture and attach a photograph, a scan, a signature or a form response with tamper evidence, and queue it offline alongside the record it belongs to.

**When unbound.** Photographic and biometric evidence cannot be captured. Strength is capped at geofence_confirmed. Tenants whose contracts require photographic evidence cannot meet them, which is a pack publication concern rather than a runtime one.

### `billing`

**Cardinality:** `zero_or_one`

Store rendered documents and resolve the evidence references carried on outcomes and lines.

**When unbound.** Documents are rendered at delivery and not stored, so a re-send may produce a subtly different rendering. Line evidence cannot be shown to a disputing counterparty, which turns every evidenced dispute into an unevidenced one.

### `catalog`

**Cardinality:** `zero_or_one`

Store and resolve item images.

**When unbound.** Items carry no image. Every surface renders a text-only catalogue, which is usable and materially worse for any consumer-facing channel.

### `core_audit`

**Cardinality:** `zero_or_one`

Resolve a reference to a captured photo, signature, scan or geolocation so that an audit row concerning an evidenced action can link to the evidence rather than duplicate it.

**When unbound.** Audit rows record that evidence was declared and record its content hash, but cannot render or link it. The hash is still recorded, so evidence produced later can be matched against what was claimed at the time.

### `helpdesk`

**Cardinality:** `zero_or_one`

Store and resolve attachments on messages, including photographs sent by reporters.

**When unbound.** Attachments cannot be stored. Reporters describing a problem in words rather than showing it makes triage materially harder, and it is not a blocker.

### `inventory`

**Cardinality:** `zero_or_one`

Attach a photograph to a wastage, a count variance or a rejected receipt.

**When unbound.** Wastage and variance carry a reason and no evidence. For any tenant whose losses are material this materially weakens the record and it is not a blocker.

### `kitchen_flow`

**Cardinality:** `zero_or_one`

Attach a photograph to a completed step or a recall, with tamper evidence and offline queueing.

**When unbound.** Recalls carry a reason and no evidence. Quality disputes about a recall become one person's word, which is materially weaker and is not a blocker.

### `lease_management`

**Cardinality:** `zero_or_one`

Store executed agreements, notices, condition schedules and deposit protection evidence.

**When unbound.** Documents are referenced by number only. A disputed term, a served notice or a deposit protection cannot be produced without going to a filing cabinet, which for a capability whose entire subject matter is agreements is a material weakening.

### `offline_sync`

**Cardinality:** `zero_or_one`

Hold captured items in the same atomic unit as the mutation they evidence, and replay them together.

**When unbound.** Mutations queue without evidence and any capability requiring evidence cannot operate offline. The atomicity guarantee is unnecessary and the field surface refuses evidenced actions offline rather than accepting them and losing the evidence.

### `party`

**Cardinality:** `zero_or_one`

Store and later resolve identity documents and consent recordings with tamper evidence, returning a reference rather than the content.

**When unbound.** Identity documents and consent evidence cannot be attached. identity_verified_at may still be set by staff_attestation, which records WHO asserted the verification and when, and the party record is marked as attested-without-evidence so that a later audit can tell the difference. Consent with consent_marketing=granted is REFUSED without evidence, because unevidenced marketing consent is the one case where recording it is worse than not recording it.


### `people`

**Cardinality:** `zero_or_one`

Store and resolve qualification documents and absence evidence with tamper evidence, returning references rather than content.

**When unbound.** Qualifications may be recorded with verification_method=document_seen and no attached document. Any qualification_type with evidence_required=true cannot be verified at all, so its members cannot be activated. This is a hard degradation and the pack must either bind the port or ship no evidence-required types.


### `procurement`

**Cardinality:** `zero_or_one`

Store delivery notes, supplier invoice documents and photographs of damaged or rejected goods.

**When unbound.** Documents are referenced by number only. A damage dispute becomes one person's account, and a supplier invoice cannot be produced during an audit without going to a filing cabinet. Not a blocker and a material weakening of every dispute.

### `scheduling_dispatch`

**Cardinality:** `zero_or_one`

Capture presence or completion evidence against an assignment.

**When unbound.** no_show is determined by the absence of any other signal rather than by the absence of presence evidence, which makes it far weaker and much more likely to be disputed. The no-show record states which basis was used.

### `work_order`

**Cardinality:** `zero_or_one`

Capture and attach photos, signatures, geolocation and form responses with tamper evidence, and queue them when offline.

**When unbound.** Actions requiring evidence become unavailable and the reason is shown, rather than silently permitting unevidenced completion. Work types with evidence requirements cannot be published. Existing orders from such a type complete only through the override path, and every such completion is reported.


## Generated provider conformance tests

**PC-01** A provider bound to `evidence_capture` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `evidence_capture` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `evidence_capture` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

