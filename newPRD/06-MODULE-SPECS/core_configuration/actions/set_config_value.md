---
doc_id: ACT-CORE_CONFIGURATION-SET_CONFIG_VALUE
title: Action — Change a setting
generated: true
source_model: _model/capabilities/core_configuration.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Change a setting

*This document is generated. Edit `_model/capabilities/core_configuration.yaml`, not this file.*

**Entity:** `config_value` · **Capability:** `core_configuration`

## 1. Specification

### Who can perform it

- tenant_admin
- tenant_owner
- platform_operator

### Preconditions

- The definition is active.
- scope_kind is at or above the definition's lowest_settable_scope.
- The acting principal may administer the declaring capability at the named scope.
- The value passes type, range and validation_expression checks.
- change_impact is immediate or next_session, otherwise the write must go through a change set.

### Inputs

- config_key
- scope_kind
- scope_ref
- value
- reason
- effective_from
- expected_current_value_id

### What is created

- config_value

### What is modified

- previous config_value superseded
- resolution caches invalidated

### What events fire

- config.changed

### Who is notified

- **to**: tenant_admin; **channel**: in_app; **when**: the definition is financial or sensitive; **template**: sensitive_setting_changed; **must_include**: ['config_label', 'old_value', 'new_value', 'actor_display_name', 'scope']; **batching_policy**: one message per change set, never one per key

### Can it be undone

Yes.

### Concurrency behaviour

Optimistic on expected_current_value_id. Two administrators changing the same key at the same scope: the second receives E_CONFLICT_VERSION with both values and the identity of the other administrator, and must choose. Last-write-wins is refused here deliberately - for a setting like an overtime threshold or a billing rounding rule, silently discarding one administrator's decision has a money consequence.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | value fails type parse, range or validation_expression | field-specific | False | the message must state the range and the current value, because "invalid" alone sends the administrator to support |
| `E_PRECONDITION` | 409 | change_impact is requires_staging or requires_migration | This change has to be tested in staging first. | False | the API offers the change-set path in the error body rather than only refusing |
| `E_AUTHZ_SCOPE` | 404 | scope_ref names a site the principal cannot reach | Not found. | False |  |
| `E_PRECONDITION` | 409 | scope_kind narrower than lowest_settable_scope | This setting can only be changed for the whole workspace. | False | names the scope that IS permitted |
| `E_CONFLICT_VERSION` | 409 | concurrent change | Someone else changed this record. | True |  |
| `E_VALIDATION` | 422 | reason empty on a financial or sensitive setting | Give a reason. It is recorded. | False |  |
| `E_PRECONDITION` | 409 | the definition is deprecated | This setting is being replaced. Use the new one. | False | names replaced_by_config_key |

## 3. Edge cases

**EC-01.** Setting a value at a scope where a narrower value already exists. The narrower value still wins. The surface shows this before saving, naming the overriding scopes and their values, because an administrator changing a tenant default and seeing nothing happen at three sites will otherwise conclude the software is broken.

**EC-02.** Clearing a value rather than setting one. Modelled as a distinct input - clear rather than a value of empty string - because for a string setting, empty and unset are different and conflating them is a classic three-valued bug.

**EC-03.** A value set with effective_from in the future while an immediate change is also made. Both rows exist; the immediate one is active, the future one is scheduled. The surface shows the upcoming change, because a setting that will change on its own at midnight and gives no warning is indistinguishable from a fault.

**EC-04.** Changing a session-timeout or geofence-radius setting while shifts are in progress. Change_impact next_session means live sessions are unaffected; the change applies to the next one. Retroactively shortening a live session mid-shift is an outage, and this is why the impact classification exists.

**EC-05.** A pack installation writing a pack_default over a value a tenant explicitly set. The tenant value wins by precedence and the pack value is recorded as the underlying default. A pack that could silently overwrite tenant intent would make upgrades terrifying.

**EC-06.** Setting a value for a capability that is not enabled in this tenant. Permitted and stored. It resolves to nothing until the capability is enabled. Refusing would make staging a pack impossible, and discarding would lose the administrator's work.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_configuration/config_value/set_config_value.md`.
