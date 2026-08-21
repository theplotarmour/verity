---
doc_id: ACT-HQ_CONSOLE-PROVISION_TENANT
title: Action — Create a workspace
generated: true
source_model: _model/capabilities/hq_console.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Create a workspace

*This document is generated. Edit `_model/capabilities/hq_console.yaml`, not this file.*

**Entity:** `tenant` · **Capability:** `hq_console`

## 1. Specification

### Who can perform it

- platform_operator

### Preconditions

- the key is globally unique
- a residency region is chosen
- a system template or pack set is chosen
- an initial tenant_owner identifier is supplied

### Inputs

- key
- display_name
- plan_key
- data_residency_region
- primary_locale
- primary_timezone
- template_key
- initial_owner_identifier

### What is created

- tenant
- tenant_manifest
- an invitation for the initial owner

### What is modified

None.

### What events fire

- platform.tenant_provisioned

### Who is notified

- **to**: the initial owner identifier; **channel**: their identifier's channel; **when**: always; **template**: workspace_ready; **must_include**: ['workspace_name', 'how_to_sign_in']; **cost_class**: utility
- **to**: the relationship owner; **channel**: in_app; **when**: always; **template**: tenant_provisioned

### Can it be undone

Yes.

### Concurrency behaviour

Provisioning is a single transaction over the tenant row and its first manifest, with the workspace made reachable only after both commit. A partial provisioning is rolled back entirely rather than left reachable, because a workspace with half its capabilities is worse than one that is not there - the customer signs in, finds it broken, and forms a view of the product in the first five minutes.


### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_CONFLICT_UNIQUE` | 409 | the key already exists | That workspace key is taken. | False |  |
| `E_VALIDATION` | 422 | an unsupported residency region | field-specific | False | immutable afterwards, so it is validated hard here. Changing it later is a migration with legal consequences |
| `E_PRECONDITION` | 409 | the template references a withdrawn capability version | This action is not available in the current state. | False | names the version, because provisioning onto a withdrawn version is how a new customer starts on a known defect |
| `E_DEPENDENCY` | 424 | manifest generation failed | *(silent)* | True | the whole provisioning rolls back. A tenant with no manifest is a tenant nobody can describe |
| `E_QUOTA` | 402 | the platform region is at capacity | Plan limit reached. | False | refused rather than provisioned into a different region, because residency is immutable and silently choosing a different one is a legal problem rather than an inconvenience |

## 3. Edge cases

**EC-01.** Provisioning from a system template. The template is a snapshot and not a live link, per the composition model, so the tenant does not track template updates. This is stated at provisioning time because the assumption otherwise is the reverse, and it is the source of the expectation that a template fix reaches existing tenants.

**EC-02.** Provisioning with an initial owner who never accepts. The workspace exists with no principal who can sign in, which the active-state monitor detects. The invitation expiry machinery in core_identity_session governs, and a workspace that reaches expiry with no owner is escalated rather than left.

**EC-03.** Two operators provisioning the same customer concurrently. The key uniqueness collapses them, which is why the key rather than the display name is the identity - two workspaces for one customer is a support problem that persists for years.

**EC-04.** Provisioning a trial that is never used. Detected by the trial silence monitor. This is a commercial signal living in a technical capability because it is the only place that knows whether anybody has signed in.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/hq_console/tenant/provision_tenant.md`.
