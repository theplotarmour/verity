---
doc_id: ACT-CORE_AUTHORIZATION-EVALUATE_PERMISSION
title: Action — Evaluate a permission decision
generated: true
source_model: _model/capabilities/core_authorization.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Evaluate a permission decision

*This document is generated. Edit `_model/capabilities/core_authorization.yaml`, not this file.*

**Entity:** `role_binding` · **Capability:** `core_authorization`

**Why this exists:** Modelled as an explicit action rather than left implicit, because it is the single most frequently executed operation in the platform and its failure modes, caching semantics and audit behaviour are load-bearing product decisions rather than implementation details.


## 1. Specification

### Who can perform it

- integration_principal
- any_authenticated

### Preconditions

- session is valid and not revoked
- tenant is not suspended

### Inputs

- principal_id
- tenant_id
- verb
- capability_key
- entity_key
- subject_id_optional
- requested_field_set

### What is created

- audit_row_when_the_verb_or_field_is_gated

### What is modified

None.

### What events fire

None.

### Who is notified

None.

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

Decisions are computed from a snapshot of the principal's effective grants taken at the start of the request and held for the duration of that request only. A permission revoked mid-request does not retroactively fail the request. A permission revoked between requests takes effect on the next request. There is no permission cache with a TTL longer than one request on the server; the client-side cache is advisory, used only to decide which affordances to render, and is never trusted for a decision.


### Audit class

read_sensitive_only

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_AUTHZ_ENTITY` | 403 | no grant for this verb on this entity in any bound role | You do not have access to this record type. | False | safe to be specific here - the entity type is not secret, only the records are |
| `E_AUTHZ_SCOPE` | 404 | grant exists but the subject is outside every bound scope | Not found. | False | deliberately 404. The response must also be timing-indistinguishable from a genuine miss, which means the scope check must not short-circuit before the existence check in a way an attacker can measure |
| `E_AUTHZ_FIELD` | 200 | requested field is gated by view_financial or view_sensitive and the principal holds neither | *(silent)* | False | the field is omitted from the payload; the response is 200 |
| `E_INTERNAL` | 500 | a condition_expression evaluated to neither true nor false - null propagation, missing context, or a traversal the principal cannot perform | Something went wrong. The team has been notified. | True | FAILS CLOSED. Kernel K16 mandates explicit three-valued logic. Treating unknown as false would silently deny; treating it as true would silently permit. Neither is acceptable, so the request fails and somebody is told |
| `E_DEPENDENCY` | 424 | org_structure port bound but unavailable | A required service is unavailable. | True | FAILS CLOSED. A scope that cannot be resolved denies. The alternative - falling back to a wider scope - is a privilege escalation triggered by an outage |
| `E_RATE_LIMIT` | 429 | a single principal generating more than evaluation_rate_limit decisions per minute | Too many attempts. Try again shortly. | True | this limit exists to catch a runaway integration, and it is deliberately generous; a human cannot reach it |

## 3. Edge cases

**EC-01.** Two roles grant the same verb at different scopes. The result is the UNION of the scopes, never the intersection. Intersection would make adding a role able to reduce access, which no administrator expects.

**EC-02.** One role allows and another denies the same verb. DENY wins, evaluated last. This is the only non-additive rule and it is stated in the kernel rather than being configurable.

**EC-03.** A DENY grant at a narrower scope than an ALLOW. The deny applies only within its own scope. A deny on own_site does not cancel an allow at tenant scope outside that location.

**EC-04.** The principal holds no bindings at all. Every entity check denies. The surface shows an explicit "no access has been granted to you yet" state naming who to contact, not an empty dashboard, because an empty dashboard reads as a broken product.

**EC-05.** A subject that does not exist and a subject outside scope must be indistinguishable in status code, body and response time. This is tested explicitly, not assumed, because the natural implementation - look up, then check scope - leaks existence through timing.

**EC-06.** Evaluation during an impersonated session uses the impersonated principal's permissions, intersected with any redaction the impersonation grant carries. A platform_support impersonation redacts financial fields even where the impersonated principal could read them, so support cannot see a customer's margins.

**EC-07.** A grant referencing a capability that is currently disabled in the tenant manifest evaluates to deny, not to error. Disabling a capability must not produce 500s across the console.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_authorization/role_binding/evaluate_permission.md`.
