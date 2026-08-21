---
doc_id: API-LEGAL_HOLD
title: API contract — Legal Hold
generated: true
source_model: _model/capabilities/core_audit.yaml
regenerate_with: python3 _tools/generate.py
---

# API contract — Legal Hold

*Generated. Edit `_model/capabilities/core_audit.yaml`, not this file.*

All responses are permission-projected. A field the caller may not read is **absent** from the payload, never `null`, so a client cannot distinguish *hidden* from *empty*. Out-of-scope subjects return `404`, never `403`.

## Resource shape

```json
{
  "id": "uuid"  // immutable,
  "tenant_id": "uuid"  // immutable,
  "reference": "string",
  "scope_expression": "text",
  "applied_by_principal_id": "uuid",
  "applied_at": "timestamptz"  // immutable,
  "expected_release_at": "timestamptz",
  "released_at": "timestamptz",
  "released_by_principal_id": "uuid",
  "release_reason": "text",
  "affected_record_count": "bigint"
}
```

## Endpoints

| Method | Path | Action | Verb | Idempotent |
|---|---|---|---|---|
| GET | `/api/v1/core_audit/legal_hold` | list | `list` | yes |
| GET | `/api/v1/core_audit/legal_hold/{id}` | read | `view` | yes |
| POST | `/api/v1/core_audit/legal_hold/{id}/apply_legal_hold` | Place a legal hold | `execute` | yes |

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
> Location: `legal_hold.api.query_semantics` · Capability: `core_audit`  
> **Blocks:** `ui:list:legal_hold`, `performance:legal_hold`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
