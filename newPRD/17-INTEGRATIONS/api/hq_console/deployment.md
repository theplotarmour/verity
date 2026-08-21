---
doc_id: API-DEPLOYMENT
title: API contract — Deployment
generated: true
source_model: _model/capabilities/hq_console.yaml
regenerate_with: python3 _tools/generate.py
---

# API contract — Deployment

*Generated. Edit `_model/capabilities/hq_console.yaml`, not this file.*

All responses are permission-projected. A field the caller may not read is **absent** from the payload, never `null`, so a client cannot distinguish *hidden* from *empty*. Out-of-scope subjects return `404`, never `403`.

## Resource shape

```json
{
  "id": "uuid"  // immutable,
  "label": "string",
  "kind": "enum",
  "target_selector": "text",
  "target_tenant_count": "int",
  "from_versions": "json",
  "to_versions": "json",
  "is_breaking": "bool",
  "broken_override_count": "int",
  "rehearsal_run_ref": "string",
  "rehearsal_outcome": "enum",
  "approved_by_principal_id": "uuid",
  "approval_reason": "text",
  "wave_size": "int",
  "started_at": "timestamptz",
  "completed_at": "timestamptz",
  "succeeded_count": "int",
  "failed_count": "int",
  "halted_reason": "text"
}
```

## Endpoints

| Method | Path | Action | Verb | Idempotent |
|---|---|---|---|---|
| GET | `/api/v1/hq_console/deployment` | list | `list` | yes |
| GET | `/api/v1/hq_console/deployment/{id}` | read | `view` | yes |

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
> Location: `deployment.api.query_semantics` · Capability: `hq_console`  
> **Blocks:** `ui:list:deployment`, `performance:deployment`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
