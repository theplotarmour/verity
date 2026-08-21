---
doc_id: API-PRICE_RULE
title: API contract — Price Rule
generated: true
source_model: _model/capabilities/catalog.yaml
regenerate_with: python3 _tools/generate.py
---

# API contract — Price Rule

*Generated. Edit `_model/capabilities/catalog.yaml`, not this file.*

All responses are permission-projected. A field the caller may not read is **absent** from the payload, never `null`, so a client cannot distinguish *hidden* from *empty*. Out-of-scope subjects return `404`, never `403`.

## Resource shape

```json
{
  "id": "uuid"  // immutable,
  "tenant_id": "uuid"  // immutable,
  "item_id": "uuid",
  "category_id": "uuid",
  "scope_kind": "enum",
  "scope_ref": "uuid",
  "currency": "string"  // gated:view_financial,
  "amount_minor": "money_minor"  // gated:view_financial,
  "percent_of_list": "decimal"  // gated:view_financial,
  "min_quantity": "decimal",
  "max_quantity": "decimal",
  "effective_from": "timestamptz",
  "effective_to": "timestamptz",
  "precedence": "int",
  "tax_inclusive": "bool"  // gated:view_financial,
  "rounding_rule": "enum"  // gated:view_financial,
  "source": "enum"
}
```

## Endpoints

| Method | Path | Action | Verb | Idempotent |
|---|---|---|---|---|
| GET | `/api/v1/catalog/price_rule` | list | `list` | yes |
| GET | `/api/v1/catalog/price_rule/{id}` | read | `view` | yes |
| POST | `/api/v1/catalog/price_rule/{id}/resolve_price` | Work out what something costs | `execute` | yes |

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
> Location: `price_rule.api.query_semantics` · Capability: `catalog`  
> **Blocks:** `ui:list:price_rule`, `performance:price_rule`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
