---
doc_id: ACT-PEOPLE-ENGAGE_MEMBER
title: Action — Engage someone
generated: true
source_model: _model/capabilities/people.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Engage someone

*This document is generated. Edit `_model/capabilities/people.yaml`, not this file.*

**Entity:** `workforce_member` · **Capability:** `people`

## 1. Specification

### Who can perform it

- tenant_admin
- ops_manager
- supervisor

### Preconditions

- the party exists and is not blocked
- no non-ended member already exists for this party in this tenant
- engaged_from is supplied

### Inputs

- party_ref
- member_code
- engagement_kind
- supplying_party_ref
- primary_location_ref
- engaged_from
- engaged_to
- availability_pattern
- hours_limits

### What is created

- workforce_member
- qualification rows in state claimed for every mandatory type

### What is modified

None.

### What events fire

- workforce_member.engaged

### Who is notified

- **to**: the engaging principal and the supervisor of the primary location; **channel**: in_app; **when**: always; **template**: onboarding_started; **must_include**: ['member_display_name', 'missing_mandatory_qualifications']

### Can it be undone

Yes.

### Concurrency behaviour

Unique index over (tenant_id, party_ref) among non-ended rows. A concurrent second engagement loses and resolves to the idempotent return above.

### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_CONFLICT_UNIQUE` | 409 | an active engagement already exists for this party | This person is already engaged. | False | offers the existing record |
| `E_PRECONDITION` | 409 | the party is blocked | This action is not available in the current state. | False |  |
| `E_VALIDATION` | 422 | engagement_kind is supplied_by_third_party with no supplying party | Choose the supplying organisation. | False |  |
| `E_AUTHZ_FIELD` | 200 | cost rate supplied without view_financial | *(silent)* | False | the field is dropped and the creator is told which fields were not saved |
| `E_QUOTA` | 402 | headcount limit reached | Plan limit reached. | False |  |
| `E_DEPENDENCY` | 424 | party_directory unavailable | A required service is unavailable. | True | engagement is blocked rather than proceeding with a dangling reference, because a member whose person cannot be resolved cannot be paid, contacted or identified |

## 3. Edge cases

**EC-01.** Engaging somebody who previously ended an engagement with this tenant. A new member row is created and the old one is retained. The new record shows the previous engagement and its rehire_eligible value prominently, because that is the fact the person engaging needs and it is exactly the fact a fresh record hides.

**EC-02.** Engaging somebody who is simultaneously engaged by a different tenant. Entirely legal and invisible - the two tenants cannot see each other. This means working-hour limits are enforceable only within one tenant, which is a real limitation with a safety dimension and is flagged in open_questions rather than papered over.

**EC-03.** Engagement with engaged_from in the future. The member sits in onboarding and does not become active until that date, and the onboarding stuck policy does not start its clock until then.

**EC-04.** Engaging with no mandatory qualifications defined at all. Activation succeeds immediately. This is correct for a tenant that has not configured any, and the surface says so rather than implying the person was checked.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/people/workforce_member/engage_member.md`.
