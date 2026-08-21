---
doc_id: API-ORDER_LINE
title: API contract — Order Line
generated: true
source_model: _model/capabilities/order.yaml
regenerate_with: python3 _tools/generate.py
---

# API contract — Order Line

*Generated. Edit `_model/capabilities/order.yaml`, not this file.*

All responses are permission-projected. A field the caller may not read is **absent** from the payload, never `null`, so a client cannot distinguish *hidden* from *empty*. Out-of-scope subjects return `404`, never `403`.

## Resource shape

```json
{
  "id": "uuid"  // immutable,
  "tenant_id": "uuid"  // immutable,
  "order_id": "uuid",
  "line_number": "int",
  "item_ref": "uuid",
  "item_label_at_time": "string",
  "selected_option_refs": "json",
  "option_summary_at_time": "string",
  "quantity": "decimal",
  "unit_of_measure": "string",
  "unit_price_minor": "money_minor"  // gated:view_financial,
  "price_rule_ref": "uuid"  // gated:view_financial,
  "line_adjustment_minor": "money_minor"  // gated:view_financial,
  "adjustment_kind": "enum"  // gated:view_financial,
  "adjustment_reason": "text"  // gated:view_financial,
  "adjustment_by_principal_id": "uuid"  // gated:view_financial,
  "tax_classification_at_time": "string"  // gated:view_financial,
  "line_total_minor": "money_minor"  // gated:view_financial,
  "fulfilment_route_ref": "uuid",
  "fulfilled_quantity": "decimal",
  "void_reason": "text",
  "notes": "text",
  "added_at": "timestamptz"  // immutable,
  "added_by_principal_id": "uuid"
}
```

## Endpoints

| Method | Path | Action | Verb | Idempotent |
|---|---|---|---|---|
| GET | `/api/v1/order/order_line` | list | `list` | yes |
| GET | `/api/v1/order/order_line/{id}` | read | `view` | yes |
| POST | `/api/v1/order/order_line/{id}/capture_line` | Add something to an order | `execute` | yes |
| POST | `/api/v1/order/order_line/{id}/modify_line` | Change a line after it has been sent | `execute` | yes |
| POST | `/api/v1/order/order_line/{id}/void_line` | Take a line off an order | `execute` | yes |

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
> Location: `order_line.api.query_semantics` · Capability: `order`  
> **Blocks:** `ui:list:order_line`, `performance:order_line`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
