---
doc_id: API-CANCELLATION_POLICY
title: API contract — Cancellation Policy
generated: true
source_model: _model/capabilities/booking.yaml
regenerate_with: python3 _tools/generate.py
---

# API contract — Cancellation Policy

*Generated. Edit `_model/capabilities/booking.yaml`, not this file.*

All responses are permission-projected. A field the caller may not read is **absent** from the payload, never `null`, so a client cannot distinguish *hidden* from *empty*. Out-of-scope subjects return `404`, never `403`.

## Resource shape

```json
{
  "id": "uuid"  // immutable,
  "tenant_id": "uuid"  // immutable,
  "key": "string"  // immutable,
  "label": "string",
  "free_cancellation_hours": "int",
  "late_cancellation_charge_percent": "int"  // gated:view_financial,
  "no_show_charge_percent": "int"  // gated:view_financial,
  "deposit_percent": "int"  // gated:view_financial,
  "deposit_refundable_before_hours": "int"  // gated:view_financial,
  "free_reschedules": "int",
  "reschedule_charge_percent": "int"  // gated:view_financial,
  "applies_to_channels": "json",
  "disclosure_text": "text"
}
```

## Endpoints

| Method | Path | Action | Verb | Idempotent |
|---|---|---|---|---|
| GET | `/api/v1/booking/cancellation_policy` | list | `list` | yes |
| GET | `/api/v1/booking/cancellation_policy/{id}` | read | `view` | yes |

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
> Location: `cancellation_policy.api.query_semantics` · Capability: `booking`  
> **Blocks:** `ui:list:cancellation_policy`, `performance:cancellation_policy`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
