---
doc_id: TEST-RAISE_TICKET
title: Test catalogue — Report something
generated: true
source_model: _model/capabilities/helpdesk.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Report something

*This document is generated. Edit `_model/capabilities/helpdesk.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `raise_ticket` is invoked by an authorised actor, then the declared records are created/updated and events ['ticket.raised'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `raise_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `raise_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `raise_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `raise_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `raise_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `raise_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `raise_ticket` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `raise_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `raise_ticket` succeeds. 

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `raise_ticket` succeeds. 

**T-012** As `consumer` (Consumer (B2C)), invoking `raise_ticket` succeeds. 

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `raise_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `raise_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `raise_ticket` succeeds. 

## Tenant isolation

**T-016** A principal in tenant A invoking `raise_ticket` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: neither subject nor body present → expect `E_VALIDATION`, message: 'Say what the problem is.'. the only refusal on this path, and even it accepts a subject alone or a body alone

**T-018** Cause: the chosen category requires a subject and none is supplied → expect `E_PRECONDITION`. the ticket is CREATED without the category rather than refused, and triage sets it. Refusing a report because a classification is incomplete is exactly the behaviour that sends people to the telephone

**T-019** Cause: more than raise_burst per source per hour → expect `E_RATE_LIMIT`, message: 'Too many attempts. Try again shortly.'. catches a mail loop, which otherwise produces thousands of tickets overnight. The limit is per source address and generous enough that a genuine reporter never meets it

**T-020** Cause: open ticket limit reached → expect `E_QUOTA`, message: 'Plan limit reached.'.

**T-021** Cause: the party directory is bound but unavailable → expect `E_DEPENDENCY`. the ticket is CREATED with the raw contact and no party match, and matching is retried. A report must never be lost because a directory is down

## Edge cases

**T-022** (EC-01) An automated message loop - an out-of-office replying to an acknowledgement which triggers another acknowledgement. Caught by the rate limit and by never acknowledging a message whose headers indicate it is automated. This single behaviour prevents the classic overnight helpdesk flood.

**T-023** (EC-02) A reporter stating that everything is urgent. Recorded as priority_source=reporter_stated, and the effective priority is whatever the category or rule says unless a person overrides it. Treating a stated urgency as the actual priority means every ticket is urgent within a month and the field stops meaning anything.

**T-024** (EC-03) A report arriving from an address matching two parties. No party is matched and the raw contact is retained. Guessing between two parties produces a ticket visible to the wrong customer, which is a disclosure rather than an inconvenience.

**T-025** (EC-04) A monitoring signal raising a ticket automatically. Fully supported through channel=monitoring_signal, and idempotent on the signal's own identifier so that a flapping condition produces one ticket rather than one per flap. The ticket carries the signal's own recovery notification when it clears, and does not auto-resolve - a condition clearing is not the same as somebody having dealt with it.

**T-026** (EC-05) A walk-in report typed by staff on behalf of somebody. reporter_party_ref is the reporter and the author of the inbound message is the staff member, so the correspondence reads correctly and the response-time measurement still starts from the report.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
