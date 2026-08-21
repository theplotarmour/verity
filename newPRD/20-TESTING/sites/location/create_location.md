---
doc_id: TEST-CREATE_LOCATION
title: Test catalogue — Add a location
generated: true
source_model: _model/capabilities/sites.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Add a location

*This document is generated. Edit `_model/capabilities/sites.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `create_location` is invoked by an authorised actor, then the declared records are created/updated and events ['location.created'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `create_location` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `create_location` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `create_location` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `create_location` succeeds. 

**T-006** As `finance` (Finance), invoking `create_location` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `create_location` succeeds. 

**T-008** As `supervisor` (Site Supervisor), invoking `create_location` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `create_location` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `create_location` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `create_location` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `create_location` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `create_location` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `create_location` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `create_location` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `create_location` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: code already exists → expect `E_CONFLICT_UNIQUE`, message: 'That code is already used by another location.'. names the other location if the creator can see it

**T-018** Cause: parent is at the same or a lower level → expect `E_VALIDATION`, message: 'A location cannot sit inside something smaller than itself.'.

**T-019** Cause: timezone missing or unrecognised → expect `E_VALIDATION`, message: 'Choose a timezone.'. never defaulted from the tenant, because a silently inherited timezone is correct until the day it is not and then breaks every shift boundary at that location at once

**T-020** Cause: the parent has owning_party_ref set and this location does not → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. the tenant's own hierarchy may not hang beneath a counterparty's

**T-021** Cause: location count limit reached → expect `E_QUOTA`, message: 'Plan limit reached.'.

**T-022** Cause: address_resolution unavailable while an address was supplied → expect `E_DEPENDENCY`. the location is created with the address stored verbatim and no position, and the creator is told that a geofence cannot be added until a position is set. Creation is never blocked on geocoding

## Edge cases

**T-023** (EC-01) A location created without a position. Fully valid. Positions arrive later, frequently from the first person to visit. What must not happen is a geofence being created against a null position, and that is refused at the geofence rather than by forcing a position here.

**T-024** (EC-02) Two locations at the same address - separate tenancies in one building. Legal and common. The duplicate check warns and does not block, because refusing would make the model unable to describe a building with several occupiers.

**T-025** (EC-03) A location whose parent is later archived. Refused at archive time by the guard on the parent, not by orphaning the child. Archiving is blocked while any child is active, and the error names the children.

**T-026** (EC-04) Creating a location under a region that belongs to a different tenant. Impossible by row-level security rather than by application check, which is why the tenancy is declared rather than assumed.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
