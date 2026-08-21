---
doc_id: TEST-HOLD_SLOT
title: Test catalogue — Hold a slot while somebody decides
generated: true
source_model: _model/capabilities/booking.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Hold a slot while somebody decides

*This document is generated. Edit `_model/capabilities/booking.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `hold_slot` is invoked by an authorised actor, then the declared records are created/updated and events ['booking.held'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `hold_slot` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `hold_slot` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `hold_slot` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `hold_slot` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `hold_slot` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `hold_slot` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `hold_slot` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `hold_slot` succeeds. 

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `hold_slot` succeeds. 

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `hold_slot` succeeds. 

**T-012** As `consumer` (Consumer (B2C)), invoking `hold_slot` succeeds. 

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `hold_slot` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `hold_slot` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `hold_slot` succeeds. 

## Tenant isolation

**T-016** A principal in tenant A invoking `hold_slot` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the slot was taken between the availability query and the hold → expect `E_CONFLICT_UNIQUE`, message: 'That time has just been taken.'. the response includes the nearest alternatives, because the person's next action is always to pick another time and making them start again is how a self-service booking is abandoned

**T-018** Cause: the location is closed at that time → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. names the operating hours

**T-019** Cause: party_size exceeds the offering capacity → expect `E_VALIDATION`, message: 'field-specific'.

**T-020** Cause: the party already holds max_concurrent_holds → expect `E_QUOTA`, message: 'Plan limit reached.'. prevents one client tying up an entire day's inventory by opening many tabs, which is both an honest mistake and an attack

**T-021** Cause: hold_burst per source exceeded → expect `E_RATE_LIMIT`, message: 'Too many attempts. Try again shortly.'.

**T-022** Cause: the resource provider is unavailable → expect `E_DEPENDENCY`, message: 'A required service is unavailable.'. the hold is REFUSED. Holding a slot without being able to verify availability produces confirmed bookings with no resource behind them

## Edge cases

**T-023** (EC-01) A hold placed and then abandoned, which is the majority outcome for self-service. It expires and the slot returns. No notification is sent, because the person is in the middle of something else and a message about an abandoned form is noise.

**T-024** (EC-02) Two people holding adjacent slots that together exceed a resource's capacity for the period. Capacity is the resource provider's concern and is enforced there. This capability holds against the resource and trusts the exclusion constraint, rather than reimplementing capacity logic that would then disagree with the scheduler.

**T-025** (EC-03) A hold surviving its expiry because the sweep is not running. Detected by the held stuck-state policy as a platform alert. This is deliberately a platform alert and not a tenant one - inventory silently disappearing is invisible from inside the tenant, who simply sees fewer available slots.

**T-026** (EC-04) A staff member holding a slot on the telephone while the person decides. Identical mechanism, longer expiry configured per channel, because a telephone conversation legitimately takes longer than a web form and a ten-minute hold that expires mid-call is worse than no hold.

**T-027** (EC-05) Holding a slot for a waiting-list offer. The hold is created by the waiting-list machinery rather than by a person, with the offer expiry as the hold expiry, so a waiting-list offer cannot be made against a slot somebody else can take in the meantime.

## Idempotency and concurrency

**T-028** Replaying the same request with the same idempotency key produces one effect and one event.

**T-029** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-030** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-031** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 31**
