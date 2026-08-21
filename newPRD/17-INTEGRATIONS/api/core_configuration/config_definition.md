---
doc_id: API-CONFIG_DEFINITION
title: API contract — Configuration Definition
generated: true
source_model: _model/capabilities/core_configuration.yaml
regenerate_with: python3 _tools/generate.py
---

# API contract — Configuration Definition

*Generated. Edit `_model/capabilities/core_configuration.yaml`, not this file.*

All responses are permission-projected. A field the caller may not read is **absent** from the payload, never `null`, so a client cannot distinguish *hidden* from *empty*. Out-of-scope subjects return `404`, never `403`.

## Resource shape

```json
{
  "id": "uuid"  // immutable,
  "config_key": "string"  // immutable,
  "declaring_capability_key": "string"  // immutable,
  "value_type": "enum"  // immutable,
  "enum_values": "json",
  "default_value": "text",
  "lowest_settable_scope": "enum",
  "validation_expression": "text",
  "range_min": "text",
  "range_max": "text",
  "change_impact": "enum",
  "nullable_meaning": "text",
  "label": "string",
  "help_text": "text",
  "decision_question": "text",
  "sensitive": "bool",
  "financial": "bool",
  "deprecated_at": "timestamptz",
  "replaced_by_config_key": "string"
}
```

## Endpoints

| Method | Path | Action | Verb | Idempotent |
|---|---|---|---|---|
| GET | `/api/v1/core_configuration/config_definition` | list | `list` | yes |
| GET | `/api/v1/core_configuration/config_definition/{id}` | read | `view` | yes |

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
> Location: `config_definition.api.query_semantics` · Capability: `core_configuration`  
> **Blocks:** `ui:list:config_definition`, `performance:config_definition`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
