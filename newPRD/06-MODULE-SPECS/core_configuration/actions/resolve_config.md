---
doc_id: ACT-CORE_CONFIGURATION-RESOLVE_CONFIG
title: Action — Resolve a setting for a principal
generated: true
source_model: _model/capabilities/core_configuration.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Resolve a setting for a principal

*This document is generated. Edit `_model/capabilities/core_configuration.yaml`, not this file.*

**Entity:** `config_value` · **Capability:** `core_configuration`

**Why this exists:** Modelled explicitly because precedence, caching and the null case are product decisions. An implicit resolver is one that gets a different answer on the server and in the offline client, which is the worst possible bug class - the software behaves differently depending on where it is running.


## 1. Specification

### Who can perform it

- any_authenticated
- integration_principal
- system

### Preconditions

- the config_key names an active or deprecated definition

### Inputs

- config_key
- tenant_id
- site_ref
- role_set
- principal_id

### What is created

None.

### What is modified

None.

### What events fire

None.

### Who is notified

None.

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

Resolution reads a consistent snapshot. A configuration change landing mid-request does not change the answer within that request, which matters because two resolutions of the same key inside one transaction returning different values would produce behaviour no test could reproduce.


### Audit class

read_sensitive_only

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | unknown config_key | *(silent)* | False | a programming error, not a user error. Raised to platform_operator. Deliberately NOT resolved to a fallback default, because a typo in a key silently resolving to something plausible is how a feature ships doing nothing |
| `E_PRECONDITION` | 409 | the definition is retired | *(silent)* | False | as above |
| `E_DEPENDENCY` | 424 | org_structure unavailable and a site-scoped value exists | *(silent)* | True | resolution FAILS rather than falling back to the tenant value. Falling back would silently apply a different setting than the one configured, and for a setting like an SLA target or a geofence radius that is a materially different product |

## 3. Edge cases

**EC-01.** Two role-scoped values apply because the principal holds two roles. This is the one place precedence is genuinely ambiguous, and it is resolved by a declared tiebreak - the role with the lower role_precedence_rank wins, and rank is mandatory on every role. It is NOT resolved by picking the more permissive value, because "more permissive" is undefined for a setting like a session timeout where lower is stricter and for a geofence radius where lower is also stricter but for a page size neither is.

**EC-02.** A null value at a narrow scope where a non-null value exists at a wider scope. Null WINS if the definition declares nullable_meaning, because setting something to null is an act. If the definition does not declare nullable_meaning, null at any scope is rejected at write time and so cannot occur here.

**EC-03.** The offline client resolving a value it cached before a change. It uses the cached value and the surface shows the cache age. It does not guess. Any action whose behaviour depends on a setting with change_impact requires_migration is refused offline outright.

**EC-04.** A pack_default value and a tenant value both exist. Tenant wins, and the surface shows the pack value as the thing being overridden, so an administrator can see what the pack intended.

**EC-05.** Resolution for an integration_principal, which has no site and no user scope. Only pack_default, tenant and role apply. A service account inheriting a human's user-scoped preference would be a subtle and untraceable behaviour change.

## 6. Offline behaviour

Read-only action. Served from cache when offline; the surface must show cache age.

## 7. Test coverage

See `20-TESTING/core_configuration/config_value/resolve_config.md`.
