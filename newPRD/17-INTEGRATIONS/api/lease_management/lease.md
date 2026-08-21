---
doc_id: API-LEASE
title: API contract — Lease
generated: true
source_model: _model/capabilities/lease_management.yaml
regenerate_with: python3 _tools/generate.py
---

# API contract — Lease

*Generated. Edit `_model/capabilities/lease_management.yaml`, not this file.*

All responses are permission-projected. A field the caller may not read is **absent** from the payload, never `null`, so a client cannot distinguish *hidden* from *empty*. Out-of-scope subjects return `404`, never `403`.

## Resource shape

```json
{
  "id": "uuid"  // immutable,
  "tenant_id": "uuid"  // immutable,
  "reference": "string"  // immutable,
  "counterparty_ref": "uuid",
  "space_refs": "json",
  "measured_area": "decimal",
  "area_unit": "string",
  "area_basis": "enum",
  "starts_on": "date",
  "ends_on": "date",
  "break_dates": "json",
  "notice_days": "int",
  "renewal_option": "enum",
  "renewal_window_opens_on": "date",
  "renewal_window_closes_on": "date",
  "base_amount_minor": "money_minor"  // gated:view_financial,
  "currency": "string"  // gated:view_financial,
  "payment_frequency": "enum"  // gated:view_financial,
  "payment_in_advance": "bool"  // gated:view_financial,
  "deposit_amount_minor": "money_minor"  // gated:view_financial,
  "rent_free_periods": "json",
  "document_ref": "string",
  "supersedes_lease_id": "uuid",
  "ended_reason": "enum"
}
```

## Endpoints

| Method | Path | Action | Verb | Idempotent |
|---|---|---|---|---|
| GET | `/api/v1/lease_management/lease` | list | `list` | yes |
| GET | `/api/v1/lease_management/lease/{id}` | read | `view` | yes |
| POST | `/api/v1/lease_management/lease/{id}/agree_lease` | Agree a lease | `execute` | yes |

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
> Location: `lease.api.query_semantics` · Capability: `lease_management`  
> **Blocks:** `ui:list:lease`, `performance:lease`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
