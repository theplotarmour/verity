---
doc_id: API-PRINCIPAL
title: API contract — Principal
generated: true
source_model: _model/capabilities/core_identity_session.yaml
regenerate_with: python3 _tools/generate.py
---

# API contract — Principal

*Generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

All responses are permission-projected. A field the caller may not read is **absent** from the payload, never `null`, so a client cannot distinguish *hidden* from *empty*. Out-of-scope subjects return `404`, never `403`.

## Resource shape

```json
{
  "id": "uuid"  // immutable,
  "kind": "enum"  // immutable,
  "primary_email": "citext"  // gated:view_sensitive,
  "primary_phone_e164": "string"  // gated:view_sensitive,
  "display_name": "string",
  "status": "enum",
  "mfa_enrolled": "bool",
  "password_credential_id": "uuid",
  "failed_auth_count": "int",
  "locked_until": "timestamptz",
  "last_authenticated_at": "timestamptz",
  "created_at": "timestamptz"  // immutable,
  "deactivated_at": "timestamptz"
}
```

## Endpoints

| Method | Path | Action | Verb | Idempotent |
|---|---|---|---|---|
| GET | `/api/v1/core_identity_session/principal` | list | `list` | yes |
| GET | `/api/v1/core_identity_session/principal/{id}` | read | `view` | yes |
| POST | `/api/v1/core_identity_session/principal/{id}/accept_invitation` | Accept an invitation | `execute` | yes |
| POST | `/api/v1/core_identity_session/principal/{id}/suspend_principal` | Suspend a person's access | `execute` | yes |
| POST | `/api/v1/core_identity_session/principal/{id}/reinstate_principal` | Reinstate a suspended person | `execute` | yes |
| POST | `/api/v1/core_identity_session/principal/{id}/deactivate_principal` | Close a person's account | `execute` | yes |
| POST | `/api/v1/core_identity_session/principal/{id}/unlock_principal_manual` | Unlock an account before the lockout lapses | `execute` | yes |

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
> Location: `principal.api.query_semantics` · Capability: `core_identity_session`  
> **Blocks:** `ui:list:principal`, `performance:principal`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
