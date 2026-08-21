---
doc_id: API-WORKFORCE_MEMBER
title: API contract — Workforce Member
generated: true
source_model: _model/capabilities/people.yaml
regenerate_with: python3 _tools/generate.py
---

# API contract — Workforce Member

*Generated. Edit `_model/capabilities/people.yaml`, not this file.*

All responses are permission-projected. A field the caller may not read is **absent** from the payload, never `null`, so a client cannot distinguish *hidden* from *empty*. Out-of-scope subjects return `404`, never `403`.

## Resource shape

```json
{
  "id": "uuid"  // immutable,
  "tenant_id": "uuid"  // immutable,
  "party_ref": "uuid",
  "member_code": "string",
  "engagement_kind": "enum",
  "supplying_party_ref": "uuid",
  "primary_location_ref": "uuid",
  "engaged_from": "date",
  "engaged_to": "date",
  "notice_period_days": "int",
  "cost_rate_minor": "money_minor"  // gated:view_financial,
  "cost_rate_basis": "enum"  // gated:view_financial,
  "max_hours_per_day": "decimal",
  "max_hours_per_week": "decimal",
  "min_rest_hours_between_assignments": "decimal",
  "max_consecutive_days": "int",
  "availability_pattern": "json",
  "emergency_contact_ref": "uuid"  // gated:view_sensitive,
  "bank_reference_ref": "string"  // gated:view_sensitive, gated:view_financial,
  "exit_reason": "text",
  "rehire_eligible": "enum"
}
```

## Endpoints

| Method | Path | Action | Verb | Idempotent |
|---|---|---|---|---|
| GET | `/api/v1/people/workforce_member` | list | `list` | yes |
| GET | `/api/v1/people/workforce_member/{id}` | read | `view` | yes |
| POST | `/api/v1/people/workforce_member/{id}/engage_member` | Engage someone | `execute` | yes |

## Error responses

| Code | HTTP | Semantics |
|---|---|---|
| `E_AUTHN` | 401 | Session expired. Sign in again. |
| `E_AUTHZ_ENTITY` | 403 | must not reveal record existence |
| `E_AUTHZ_SCOPE` | 404 | deliberately 404 not 403 to avoid confirming existence outside scope |
| `E_AUTHZ_FIELD` | 200 | field omitted from response, never nulled, so client cannot distinguish empty from hidden |
| `E_VALIDATION` | 422 | field-specific |
| `E_PRECONDITION` | 409 | This action is not available in the current state. |
| `E_CONFLICT_VERSION` | 409 | Someone else changed this record. |
| `E_CONFLICT_UNIQUE` | 409 | A record with this value already exists. |
| `E_RATE_LIMIT` | 429 | Too many attempts. Try again shortly. |
| `E_DEPENDENCY` | 424 | A required service is unavailable. |
| `E_QUOTA` | 402 | Plan limit reached. |
| `E_TENANT_SUSPENDED` | 423 | This workspace is suspended. |
| `E_OFFLINE_STALE` | 409 | This was changed while you were offline. |
| `E_INTERNAL` | 500 | Something went wrong. The team has been notified. |

## Pagination, filtering, sorting

> **GAP [blocking] — list query semantics not specified: pagination strategy (cursor vs offset), which fields are filterable and sortable, default sort, and maximum page size**  
> Location: `workforce_member.api.query_semantics` · Capability: `people`  
> **Blocks:** `ui:list:workforce_member`, `performance:workforce_member`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
