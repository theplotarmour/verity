---
doc_id: API-STOCK_MOVEMENT
title: API contract — Stock Movement
generated: true
source_model: _model/capabilities/inventory.yaml
regenerate_with: python3 _tools/generate.py
---

# API contract — Stock Movement

*Generated. Edit `_model/capabilities/inventory.yaml`, not this file.*

All responses are permission-projected. A field the caller may not read is **absent** from the payload, never `null`, so a client cannot distinguish *hidden* from *empty*. Out-of-scope subjects return `404`, never `403`.

## Resource shape

```json
{
  "id": "uuid"  // immutable,
  "tenant_id": "uuid"  // immutable,
  "item_ref": "uuid"  // immutable,
  "from_location_id": "uuid"  // immutable,
  "to_location_id": "uuid"  // immutable,
  "quantity": "decimal"  // immutable,
  "unit_of_measure": "string"  // immutable,
  "movement_kind": "enum"  // immutable,
  "reason_key": "string"  // immutable,
  "reason_note": "text"  // immutable,
  "source_capability_key": "string"  // immutable,
  "source_ref": "uuid"  // immutable,
  "unit_cost_minor": "money_minor"  // gated:view_financial, immutable,
  "batch_ref": "string"  // immutable,
  "expires_on": "date"  // immutable,
  "occurred_at": "timestamptz"  // immutable,
  "recorded_at": "timestamptz"  // immutable,
  "actor_principal_id": "uuid"  // immutable,
  "evidence_ref": "string"  // immutable,
  "reverses_movement_id": "uuid"  // immutable,
  "count_id": "uuid"  // immutable
}
```

## Endpoints

| Method | Path | Action | Verb | Idempotent |
|---|---|---|---|---|
| GET | `/api/v1/inventory/stock_movement` | list | `list` | yes |
| GET | `/api/v1/inventory/stock_movement/{id}` | read | `view` | yes |
| POST | `/api/v1/inventory/stock_movement/{id}/record_movement` | Record a stock movement | `execute` | yes |

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
> Location: `stock_movement.api.query_semantics` · Capability: `inventory`  
> **Blocks:** `ui:list:stock_movement`, `performance:stock_movement`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
