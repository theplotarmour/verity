---
doc_id: API-SERVICE_LEVEL
title: API contract — Service Level
generated: true
source_model: _model/capabilities/sla_contract.yaml
regenerate_with: python3 _tools/generate.py
---

# API contract — Service Level

*Generated. Edit `_model/capabilities/sla_contract.yaml`, not this file.*

All responses are permission-projected. A field the caller may not read is **absent** from the payload, never `null`, so a client cannot distinguish *hidden* from *empty*. Out-of-scope subjects return `404`, never `403`.

## Resource shape

```json
{
  "id": "uuid"  // immutable,
  "tenant_id": "uuid"  // immutable,
  "contract_id": "uuid",
  "key": "string",
  "label": "string",
  "measure_kind": "enum",
  "start_event_key": "string",
  "stop_event_key": "string",
  "target_value": "decimal",
  "target_unit": "enum",
  "calendar_ref": "uuid",
  "applies_when_expression": "text",
  "pausable_reason_keys": "json",
  "max_pause_minutes": "int",
  "measurement_period": "enum",
  "aggregation": "enum",
  "percentile": "decimal",
  "grace_value": "decimal",
  "version_number": "int"
}
```

## Endpoints

| Method | Path | Action | Verb | Idempotent |
|---|---|---|---|---|
| GET | `/api/v1/sla_contract/service_level` | list | `list` | yes |
| GET | `/api/v1/sla_contract/service_level/{id}` | read | `view` | yes |

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
> Location: `service_level.api.query_semantics` · Capability: `sla_contract`  
> **Blocks:** `ui:list:service_level`, `performance:service_level`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
