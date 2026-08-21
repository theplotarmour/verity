---
doc_id: API-ORDER
title: API contract — Order
generated: true
source_model: _model/capabilities/order.yaml
regenerate_with: python3 _tools/generate.py
---

# API contract — Order

*Generated. Edit `_model/capabilities/order.yaml`, not this file.*

All responses are permission-projected. A field the caller may not read is **absent** from the payload, never `null`, so a client cannot distinguish *hidden* from *empty*. Out-of-scope subjects return `404`, never `403`.

## Resource shape

```json
{
  "id": "uuid"  // immutable,
  "tenant_id": "uuid"  // immutable,
  "reference": "string"  // immutable,
  "channel": "enum",
  "party_ref": "uuid",
  "location_ref": "uuid",
  "destination_ref": "uuid",
  "requested_for_at": "timestamptz",
  "promised_for_at": "timestamptz",
  "currency": "string"  // gated:view_financial,
  "subtotal_minor": "money_minor"  // gated:view_financial,
  "adjustment_total_minor": "money_minor"  // gated:view_financial,
  "tax_total_minor": "money_minor"  // gated:view_financial,
  "total_minor": "money_minor"  // gated:view_financial,
  "paid_minor": "money_minor"  // gated:view_financial,
  "payment_state": "enum"  // gated:view_financial,
  "split_of_order_id": "uuid",
  "merged_into_order_id": "uuid",
  "void_reason": "text",
  "voided_by_principal_id": "uuid",
  "taken_by_principal_id": "uuid",
  "notes": "text",
  "pricing_snapshot_at": "timestamptz"
}
```

## Endpoints

| Method | Path | Action | Verb | Idempotent |
|---|---|---|---|---|
| GET | `/api/v1/order/order` | list | `list` | yes |
| GET | `/api/v1/order/order/{id}` | read | `view` | yes |
| POST | `/api/v1/order/order/{id}/split_order` | Split an order | `execute` | yes |

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
> Location: `order.api.query_semantics` · Capability: `order`  
> **Blocks:** `ui:list:order`, `performance:order`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
