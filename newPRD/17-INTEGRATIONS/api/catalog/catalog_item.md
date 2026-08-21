---
doc_id: API-CATALOG_ITEM
title: API contract — Catalog Item
generated: true
source_model: _model/capabilities/catalog.yaml
regenerate_with: python3 _tools/generate.py
---

# API contract — Catalog Item

*Generated. Edit `_model/capabilities/catalog.yaml`, not this file.*

All responses are permission-projected. A field the caller may not read is **absent** from the payload, never `null`, so a client cannot distinguish *hidden* from *empty*. Out-of-scope subjects return `404`, never `403`.

## Resource shape

```json
{
  "id": "uuid"  // immutable,
  "tenant_id": "uuid"  // immutable,
  "sku": "string"  // immutable,
  "name": "string",
  "description": "text",
  "item_kind": "enum",
  "unit_of_measure": "string",
  "category_id": "uuid",
  "tax_classification": "string",
  "is_sellable": "bool",
  "is_purchasable": "bool",
  "is_stocked": "bool",
  "default_duration_minutes": "int",
  "required_qualification_keys": "json",
  "composition_id": "uuid",
  "image_ref": "string",
  "sort_weight": "int",
  "version_number": "int",
  "replaced_by_item_id": "uuid"
}
```

## Endpoints

| Method | Path | Action | Verb | Idempotent |
|---|---|---|---|---|
| GET | `/api/v1/catalog/catalog_item` | list | `list` | yes |
| GET | `/api/v1/catalog/catalog_item/{id}` | read | `view` | yes |
| POST | `/api/v1/catalog/catalog_item/{id}/publish_item` | Publish an item | `execute` | yes |

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
> Location: `catalog_item.api.query_semantics` · Capability: `catalog`  
> **Blocks:** `ui:list:catalog_item`, `performance:catalog_item`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
