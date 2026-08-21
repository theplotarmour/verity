---
doc_id: TEST-MODIFY_LINE
title: Test catalogue — Change a line after it has been sent
generated: true
source_model: _model/capabilities/order.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Change a line after it has been sent

*This document is generated. Edit `_model/capabilities/order.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `modify_line` is invoked by an authorised actor, then the declared records are created/updated and events ['order_line.modified'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `modify_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `modify_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `modify_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `modify_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `modify_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `modify_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `modify_line` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `modify_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `modify_line` succeeds. 

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `modify_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `modify_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `modify_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `modify_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `modify_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `modify_line` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the line is already fulfilled → expect `E_PRECONDITION`, message: 'This has already been done.'. the correct path is void or return, and the message says which

**T-018** Cause: the fulfilment route refuses the modification → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. the route's refusal reason is passed through verbatim, because it is the only party that knows how far along it is

**T-019** Cause: new quantity below the already fulfilled quantity → expect `E_VALIDATION`, message: 'field-specific'. reducing below what has been produced is a void of the difference plus a decision about the cost, not a modification

**T-020** Cause: reason empty → expect `E_VALIDATION`, message: 'Say why. It is shown to whoever is working on it.'.

**T-021** Cause: a price-affecting change by a principal without view_financial → expect `E_AUTHZ_FIELD`. the quantity and options change and the price is re-resolved by the system rather than by the actor. A person who cannot see money may still change what was ordered

## Edge cases

**T-022** (EC-01) Increasing quantity on a line already partly produced. Supported and treated as a delta to the route, not as a replacement. A route that receives a replacement will produce the whole quantity again, which is exactly the failure this action exists to prevent.

**T-023** (EC-02) Modifying a line whose route has no cancellation or modification capability. The route refuses and the correct path is void plus a new line, which the error states. The already-produced portion is recorded as produced-and-voided so its cost is visible.

**T-024** (EC-03) A modification arriving while the order is on hold. Permitted; the hold suspends routing, not modification, and modifying a held order is usually why it was held.

**T-025** (EC-04) Modification of the line notes only, with no commercial effect. Still routed to the fulfilment surface at high priority, because a note is frequently the most important part of the line and a note change that does not reach the person working is worse than no note.

**T-026** (EC-05) A consumer modifying through a self-service surface after fulfilment has started. Refused with the route's own reason, and the surface offers to contact the location instead. Silently accepting a change that cannot be honoured is how a self-service order becomes a complaint.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
