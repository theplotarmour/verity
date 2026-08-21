---
doc_id: ACT-HQ_CONSOLE-DEPLOY_MANIFEST
title: Action — Change what a tenant is running
generated: true
source_model: _model/capabilities/hq_console.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Change what a tenant is running

*This document is generated. Edit `_model/capabilities/hq_console.yaml`, not this file.*

**Entity:** `tenant_manifest` · **Capability:** `hq_console`

**Why this exists:** The action with the largest blast radius in the platform. Everything about it - waves, rehearsal, explicit blast radius, broken-override visibility, halt behaviour - exists because a change applied to every tenant at once is the failure that ends a platform's reputation in an afternoon.


## 1. Specification

### Who can perform it

- platform_operator

### Preconditions

- The manifest validates against the kernel and the composition rules.
- Every broken override has been listed and acknowledged.
- The acceptance run passed or its failures were explicitly accepted with a reason.
- The acting session is elevated.
- The tenant is not mid-deployment.

### Inputs

- manifest_id
- acknowledgement_of_broken_overrides
- reason

### What is created

- a new manifest version marked deployed

### What is modified

- tenant current_manifest_id
- previous manifest superseded
- reconciliation scheduled

### What events fire

- platform.manifest_deployed

### Who is notified

- **to**: tenant_admin; **channel**: in_app; **when**: the deployment changes anything a tenant administrator configured; **template**: workspace_updated; **must_include**: ['what_changed', 'any_overrides_that_no_longer_apply']
- **to**: tenant_owner; **channel**: in_app_and_email; **when**: the change is breaking, or any override was invalidated; **template**: significant_update; **must_include**: ['what_changed', 'what_was_affected', 'who_to_contact']; **mandatory_operational**: True

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

One deployment per tenant at a time, enforced by a lock on the tenant row. A tenant-level migration runs inside its own transaction where the change permits and in a documented multi-step sequence where it does not, and the manifest is only marked deployed once the sequence completes - so a partially migrated tenant is never described by a manifest claiming it is complete.


### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | broken overrides are not acknowledged | This action is not available in the current state. | False | lists the tenant, the exact override and the change that broke it, per the composition model's upgrade semantics. They are never silently dropped |
| `E_PRECONDITION` | 409 | the acceptance run did not pass and its failures were not accepted | This action is not available in the current state. | False |  |
| `E_CONFLICT_VERSION` | 409 | the tenant's current manifest changed since this one was generated | Someone else changed this record. | True | regenerate against the current state. Deploying a manifest generated against a superseded one would silently revert whatever changed in between |
| `E_AUTHN` | 401 | session not elevated | Confirm your identity to continue. | False |  |
| `E_INTERNAL` | 500 | the migration fails partway | *(silent)* | True | the manifest is marked failed, the tenant is left in a documented intermediate state rather than an unknown one, and platform_operator is paged. The platform does NOT attempt an automatic reverse migration, because DEC-K-011 is unresolved and an unproven reversal on live customer data is worse than a known intermediate state |
| `E_PRECONDITION` | 409 | the tenant is suspended | This action is not available in the current state. | False | permitted for a hotfix with an explicit override, because a suspended tenant may still need a security fix |

## 3. Edge cases

**EC-01.** A deployment that invalidates a tenant override. Blocked until acknowledged, listed with the exact override and the change that broke it, and the tenant is told after deployment which of their configurations no longer applies. Silently dropping an override is the failure the composition model explicitly forbids, and this is where that rule is enforced.

**EC-02.** A migration whose reversibility is unknown. The confirmation states unknown rather than implying either answer, and there is no rollback offered. This is DEC-K-011 arriving at the point where it actually bites, and the model refuses to imply a capability that has not been established.

**EC-03.** A deployment to a tenant whose device fleet is largely offline. Devices on the previous dataset version continue pushing already-queued mutations and cannot queue new ones, per the offline_sync degraded behaviour. The deployment does not wait for the fleet, and the count of devices that will degrade is shown in the confirmation.

**EC-04.** Deploying only labels, terminology or branding. Takes the immediate path with no staging, per the composition model. Forcing a colour change through a staging gate is how a team stops using the staging gate for the changes that need it.

**EC-05.** A deployment during a tenant's operating hours. Permitted, and the confirmation shows the tenant's local time and whether it is within their operating calendar. The model does not forbid it, because a security fix at three in the afternoon is sometimes correct, and it does make the operator see what they are doing.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/hq_console/tenant_manifest/deploy_manifest.md`.
