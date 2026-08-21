---
doc_id: API-PERMISSION_GRANT
title: API contract — Permission Grant
generated: true
source_model: _model/capabilities/core_authorization.yaml
regenerate_with: python3 _tools/generate.py
---

# API contract — Permission Grant

*Generated. Edit `_model/capabilities/core_authorization.yaml`, not this file.*

All responses are permission-projected. A field the caller may not read is **absent** from the payload, never `null`, so a client cannot distinguish *hidden* from *empty*. Out-of-scope subjects return `404`, never `403`.

## Resource shape

```json
{
  "id": "uuid"  // immutable,
  "tenant_id": "uuid"  // immutable,
  "role_id": "uuid",
  "effect": "enum",
  "verb": "enum",
  "entity_key": "string",
  "capability_key": "string",
  "field_set_mode": "enum",
  "field_list": "json",
  "scope": "enum",
  "condition_expression": "text",
  "created_at": "timestamptz"  // immutable,
  "created_by_principal_id": "uuid"
}
```

## Endpoints

| Method | Path | Action | Verb | Idempotent |
|---|---|---|---|---|
| GET | `/api/v1/core_authorization/permission_grant` | list | `list` | yes |
| GET | `/api/v1/core_authorization/permission_grant/{id}` | read | `view` | yes |
| POST | `/api/v1/core_authorization/permission_grant/{id}/add_grant` | Add a permission to a role | `execute` | yes |

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
> Location: `permission_grant.api.query_semantics` · Capability: `core_authorization`  
> **Blocks:** `ui:list:permission_grant`, `performance:permission_grant`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
