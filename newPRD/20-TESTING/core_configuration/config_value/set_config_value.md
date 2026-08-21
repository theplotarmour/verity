---
doc_id: TEST-SET_CONFIG_VALUE
title: Test catalogue — Change a setting
generated: true
source_model: _model/capabilities/core_configuration.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Change a setting

*This document is generated. Edit `_model/capabilities/core_configuration.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `set_config_value` is invoked by an authorised actor, then the declared records are created/updated and events ['config.changed'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `set_config_value` succeeds. 

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `set_config_value` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `set_config_value` succeeds. 

**T-005** As `tenant_admin` (Tenant Administrator), invoking `set_config_value` succeeds. 

**T-006** As `finance` (Finance), invoking `set_config_value` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `set_config_value` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `set_config_value` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `set_config_value` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `set_config_value` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `set_config_value` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `set_config_value` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `set_config_value` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `set_config_value` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `set_config_value` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `set_config_value` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: value fails type parse, range or validation_expression → expect `E_VALIDATION`, message: 'field-specific'. the message must state the range and the current value, because "invalid" alone sends the administrator to support

**T-018** Cause: change_impact is requires_staging or requires_migration → expect `E_PRECONDITION`, message: 'This change has to be tested in staging first.'. the API offers the change-set path in the error body rather than only refusing

**T-019** Cause: scope_ref names a site the principal cannot reach → expect `E_AUTHZ_SCOPE`, message: 'Not found.'.

**T-020** Cause: scope_kind narrower than lowest_settable_scope → expect `E_PRECONDITION`, message: 'This setting can only be changed for the whole workspace.'. names the scope that IS permitted

**T-021** Cause: concurrent change → expect `E_CONFLICT_VERSION`, message: 'Someone else changed this record.'.

**T-022** Cause: reason empty on a financial or sensitive setting → expect `E_VALIDATION`, message: 'Give a reason. It is recorded.'.

**T-023** Cause: the definition is deprecated → expect `E_PRECONDITION`, message: 'This setting is being replaced. Use the new one.'. names replaced_by_config_key

## Edge cases

**T-024** (EC-01) Setting a value at a scope where a narrower value already exists. The narrower value still wins. The surface shows this before saving, naming the overriding scopes and their values, because an administrator changing a tenant default and seeing nothing happen at three sites will otherwise conclude the software is broken.

**T-025** (EC-02) Clearing a value rather than setting one. Modelled as a distinct input - clear rather than a value of empty string - because for a string setting, empty and unset are different and conflating them is a classic three-valued bug.

**T-026** (EC-03) A value set with effective_from in the future while an immediate change is also made. Both rows exist; the immediate one is active, the future one is scheduled. The surface shows the upcoming change, because a setting that will change on its own at midnight and gives no warning is indistinguishable from a fault.

**T-027** (EC-04) Changing a session-timeout or geofence-radius setting while shifts are in progress. Change_impact next_session means live sessions are unaffected; the change applies to the next one. Retroactively shortening a live session mid-shift is an outage, and this is why the impact classification exists.

**T-028** (EC-05) A pack installation writing a pack_default over a value a tenant explicitly set. The tenant value wins by precedence and the pack value is recorded as the underlying default. A pack that could silently overwrite tenant intent would make upgrades terrifying.

**T-029** (EC-06) Setting a value for a capability that is not enabled in this tenant. Permitted and stored. It resolves to nothing until the capability is enabled. Refusing would make staging a pack impossible, and discarding would lose the administrator's work.

## Idempotency and concurrency

**T-030** Replaying the same request with the same idempotency key produces one effect and one event.

**T-031** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-032** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-033** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 33**
