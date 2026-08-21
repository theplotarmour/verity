---
doc_id: ACT-ASSETS-REGISTER_ASSET
title: Action — Add an asset
generated: true
source_model: _model/capabilities/assets.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Add an asset

*This document is generated. Edit `_model/capabilities/assets.yaml`, not this file.*

**Entity:** `asset` · **Capability:** `assets`

## 1. Specification

### Who can perform it

- supervisor
- ops_manager
- tenant_admin
- integration_principal

### Preconditions

- a class is chosen and active
- the tag is unique within the tenant

### Inputs

- tag
- name
- asset_class_id
- parent_asset_id
- location_ref
- custodian_principal_id
- owning_party_ref
- serial_reference
- attributes
- acquired_on
- acquisition_cost_minor

### What is created

- asset
- plan attachments from the class defaults

### What is modified

- parent path index

### What events fire

- asset.registered

### Who is notified

- **to**: the named custodian; **channel**: in_app; **when**: a custodian is set; **template**: asset_assigned_to_you; **must_include**: ['tag', 'name', 'location']

### Can it be undone

Yes.

### Concurrency behaviour

Unique index on (tenant_id, tag). Path materialisation for a subtree happens under a lock on the parent, as for locations, so a child cannot compute its path from a stale parent.

### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_CONFLICT_UNIQUE` | 409 | the tag already exists | That tag is already used. | False | shows the existing asset, because the next question is always which one |
| `E_PRECONDITION` | 409 | the class is not active | This kind of asset is not available. | False |  |
| `E_VALIDATION` | 422 | a required attribute for the class is missing | field-specific | False | permitted at registration and blocking at commissioning, because a bulk import frequently lacks details that are filled in when somebody physically visits the thing |
| `E_AUTHZ_FIELD` | 200 | acquisition cost supplied without view_financial | *(silent)* | False | dropped and reported |
| `E_QUOTA` | 402 | asset count limit reached | Plan limit reached. | False |  |
| `E_VALIDATION` | 422 | parent would create a cycle or exceed the depth bound | field-specific | False | names the path |

## 3. Edge cases

**EC-01.** A bulk import at onboarding. Idempotent on the tag, so a re-uploaded file produces no duplicates. Assets arrive in registered rather than in_service, and the uncommissioned monitor is what stops several hundred of them sitting there generating no maintenance demand - which is exactly what happens without it.

**EC-02.** {'An asset registered without a class-required attribute. Permitted, and commissioning is what blocks. This split is deliberate': 'the register should accept what is known now, and the point at which the thing becomes operationally live is the right place to insist.'}

**EC-03.** Registering something that belongs to a counterparty. Fully supported through owning_party_ref and is the normal case for a maintenance business. Depreciation does not apply to it, and the surface does not show depreciation fields at all rather than showing them empty.

**EC-04.** Two physical things sharing one tag because a label was reused. The unique constraint catches it and the resolution is a new tag, never a re-tag, because the immutable tag is what keeps the physical label and the record aligned.

**EC-05.** Registration offline by somebody walking round a location with a scanner. Queued. Tag conflicts resolve on sync and are surfaced as a conflict rather than silently merged, because two things with one label is a physical problem that needs a physical fix.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/assets/asset/register_asset.md`.
