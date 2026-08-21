---
doc_id: API-SLA_MEASUREMENT
title: API contract — SLA Measurement
generated: true
source_model: _model/capabilities/sla_contract.yaml
regenerate_with: python3 _tools/generate.py
---

# API contract — SLA Measurement

*Generated. Edit `_model/capabilities/sla_contract.yaml`, not this file.*

All responses are permission-projected. A field the caller may not read is **absent** from the payload, never `null`, so a client cannot distinguish *hidden* from *empty*. Out-of-scope subjects return `404`, never `403`.

## Resource shape

```json
{
  "id": "uuid"  // immutable,
  "tenant_id": "uuid"  // immutable,
  "service_level_id": "uuid",
  "service_level_version": "int",
  "subject_ref": "uuid",
  "subject_capability_key": "string",
  "location_ref": "uuid",
  "calendar_ref_used": "uuid",
  "started_at": "timestamptz",
  "target_at": "timestamptz",
  "stopped_at": "timestamptz",
  "total_paused_minutes": "int",
  "elapsed_measured": "decimal",
  "outcome": "enum",
  "breach_at": "timestamptz",
  "breach_margin": "decimal",
  "excluded": "bool",
  "exclusion_reason": "text",
  "excluded_by_principal_id": "uuid"
}
```

## Endpoints

| Method | Path | Action | Verb | Idempotent |
|---|---|---|---|---|
| GET | `/api/v1/sla_contract/sla_measurement` | list | `list` | yes |
| GET | `/api/v1/sla_contract/sla_measurement/{id}` | read | `view` | yes |
| POST | `/api/v1/sla_contract/sla_measurement/{id}/start_clock` | Start a service-level clock | `execute` | yes |
| POST | `/api/v1/sla_contract/sla_measurement/{id}/pause_clock` | Pause a service-level clock | `execute` | yes |
| POST | `/api/v1/sla_contract/sla_measurement/{id}/exclude_measurement` | Exclude a measurement from performance | `execute` | yes |

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
> Location: `sla_measurement.api.query_semantics` · Capability: `sla_contract`  
> **Blocks:** `ui:list:sla_measurement`, `performance:sla_measurement`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
