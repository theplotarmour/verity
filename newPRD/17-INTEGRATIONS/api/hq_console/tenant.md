---
doc_id: API-TENANT
title: API contract — Tenant
generated: true
source_model: _model/capabilities/hq_console.yaml
regenerate_with: python3 _tools/generate.py
---

# API contract — Tenant

*Generated. Edit `_model/capabilities/hq_console.yaml`, not this file.*

All responses are permission-projected. A field the caller may not read is **absent** from the payload, never `null`, so a client cannot distinguish *hidden* from *empty*. Out-of-scope subjects return `404`, never `403`.

## Resource shape

```json
{
  "id": "uuid"  // immutable,
  "key": "string"  // immutable,
  "display_name": "string",
  "legal_party_ref": "string"  // gated:view_sensitive,
  "created_at": "timestamptz"  // immutable,
  "plan_key": "string"  // gated:view_financial,
  "seat_entitlement": "int"  // gated:view_financial,
  "data_residency_region": "string"  // immutable,
  "primary_locale": "string",
  "primary_timezone": "string",
  "support_access_consent_until": "timestamptz",
  "support_access_contract_clause": "bool",
  "current_manifest_id": "uuid",
  "suspension_reason": "text",
  "suspended_at": "timestamptz",
  "closure_requested_at": "timestamptz",
  "data_erasure_due_at": "timestamptz",
  "export_delivered_at": "timestamptz"
}
```

## Endpoints

| Method | Path | Action | Verb | Idempotent |
|---|---|---|---|---|
| GET | `/api/v1/hq_console/tenant` | list | `list` | yes |
| GET | `/api/v1/hq_console/tenant/{id}` | read | `view` | yes |
| POST | `/api/v1/hq_console/tenant/{id}/provision_tenant` | Create a workspace | `execute` | yes |
| POST | `/api/v1/hq_console/tenant/{id}/start_support_session` | Look at a tenant's workspace | `execute` | yes |

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
> Location: `tenant.api.query_semantics` · Capability: `hq_console`  
> **Blocks:** `ui:list:tenant`, `performance:tenant`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
