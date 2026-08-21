---
doc_id: API-SYNC_CONFLICT
title: API contract — Sync Conflict
generated: true
source_model: _model/capabilities/offline_sync.yaml
regenerate_with: python3 _tools/generate.py
---

# API contract — Sync Conflict

*Generated. Edit `_model/capabilities/offline_sync.yaml`, not this file.*

All responses are permission-projected. A field the caller may not read is **absent** from the payload, never `null`, so a client cannot distinguish *hidden* from *empty*. Out-of-scope subjects return `404`, never `403`.

## Resource shape

```json
{
  "id": "uuid"  // immutable,
  "tenant_id": "uuid"  // immutable,
  "mutation_id": "uuid",
  "capability_key": "string",
  "subject_ref": "uuid",
  "conflicting_fields": "json",
  "device_values": "json"  // immutable,
  "server_values": "json"  // immutable,
  "device_principal_id": "uuid",
  "server_principal_id": "uuid",
  "device_occurred_at": "timestamptz",
  "server_changed_at": "timestamptz",
  "auto_resolvable": "bool",
  "resolution": "enum",
  "resolved_by_principal_id": "uuid",
  "resolution_reason": "text",
  "resolved_at": "timestamptz"
}
```

## Endpoints

| Method | Path | Action | Verb | Idempotent |
|---|---|---|---|---|
| GET | `/api/v1/offline_sync/sync_conflict` | list | `list` | yes |
| GET | `/api/v1/offline_sync/sync_conflict/{id}` | read | `view` | yes |
| POST | `/api/v1/offline_sync/sync_conflict/{id}/resolve_conflict` | Decide between two versions | `execute` | yes |

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
> Location: `sync_conflict.api.query_semantics` · Capability: `offline_sync`  
> **Blocks:** `ui:list:sync_conflict`, `performance:sync_conflict`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
